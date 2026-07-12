from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, Depends, HTTPException

from app.api.sessions.models import (
    CreateSessionRequest,
    CreateSessionResponse,
    SessionDetailResponse,
    SessionListResponse,
    SessionSummary,
    SessionTurnDetail,
    SubmitTurnRequest,
    TurnResponse,
)
from app.core.assistants.evaluator import evaluate_turn
from app.core.assistants.interviewer import get_interviewer_response
from app.core.assistants.planner import plan_session
from app.core.schemas.session import PlannedQuestion
from app.dependencies import get_current_student
from app.services.supabase_client import (
    build_student_profile,
    get_last_n_turns,
    get_session_with_plan,
    get_sessions_for_user,
    get_student_profile,
    get_turns_for_session,
    update_session_status,
    write_session,
    write_turn,
)

router = APIRouter()


def _load_profile(user_id: str):
    raw = get_student_profile(user_id)
    if raw is None:
        raise HTTPException(status_code=404, detail="Profile not found — complete onboarding first")
    return build_student_profile(raw)


def _get_owned_session(session_id: str, user_id: str) -> dict:
    session = get_session_with_plan(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")
    return session


@router.get("/", response_model=SessionListResponse)
def list_sessions(user_id: str = Depends(get_current_student)):
    sessions = get_sessions_for_user(user_id, limit=5)

    summaries = []
    for session in sessions:
        turns = get_turns_for_session(session["id"])
        ratings = [t["evaluation"]["overall"] for t in turns if t.get("evaluation")]

        summaries.append(
            SessionSummary(
                session_id=session["id"],
                session_type=session["session_type"],
                status=session["status"],
                created_at=session["created_at"],
                completed_at=session.get("completed_at"),
                question_count=len(session["session_plan"]["questions"]),
                answered_count=len(turns),
                average_rating=(sum(ratings) / len(ratings)) if ratings else None,
            )
        )

    return SessionListResponse(sessions=summaries)


@router.get("/{session_id}", response_model=SessionDetailResponse)
def get_session_detail(
    session_id: str,
    user_id: str = Depends(get_current_student),
):
    session = _get_owned_session(session_id, user_id)
    turns = get_turns_for_session(session_id)

    return SessionDetailResponse(
        session_id=session["id"],
        session_type=session["session_type"],
        status=session["status"],
        created_at=session["created_at"],
        completed_at=session.get("completed_at"),
        turns=[
            SessionTurnDetail(
                turn_index=t["turn_index"],
                question=PlannedQuestion(**t["question"]),
                answer_text=t["answer_text"] or "",
                evaluation=t["evaluation"],
            )
            for t in turns
        ],
    )


@router.post("/", response_model=CreateSessionResponse)
def create_session(
    body: CreateSessionRequest,
    user_id: str = Depends(get_current_student),
):
    profile = _load_profile(user_id)
    plan = plan_session(profile, body.session_type)

    row = write_session(
        {
            "user_id": user_id,
            "session_type": body.session_type,
            "status": "in_progress",
            "session_plan": plan.model_dump(),
        }
    )

    return CreateSessionResponse(session_id=row["id"], session_plan=plan)


@router.post("/{session_id}/turns", response_model=TurnResponse)
def submit_turn(
    session_id: str,
    body: SubmitTurnRequest,
    user_id: str = Depends(get_current_student),
):
    session = _get_owned_session(session_id, user_id)
    profile = _load_profile(user_id)

    questions = session["session_plan"]["questions"]
    current_q = PlannedQuestion(**questions[body.turn_index])

    recent_turns = [
        {"question": t["question"]["text"], "answer": t["answer_text"]}
        for t in get_last_n_turns(session_id, n=3)
    ]

    with ThreadPoolExecutor(max_workers=2) as pool:
        f_interviewer = pool.submit(
            get_interviewer_response, current_q.text, body.answer_text, recent_turns
        )
        f_evaluator = pool.submit(evaluate_turn, current_q, body.answer_text, profile)
        interviewer_result = f_interviewer.result()
        evaluator_result = f_evaluator.result()

    write_turn(
        {
            "session_id": session_id,
            "turn_index": body.turn_index,
            "question": current_q.model_dump(),
            "answer_text": body.answer_text,
            "evaluation": evaluator_result.model_dump(),
        }
    )

    next_index = body.turn_index + 1
    if next_index >= len(questions):
        update_session_status(session_id, "completed")
        next_question = None
        session_complete = True
    else:
        next_question = PlannedQuestion(**questions[next_index])
        session_complete = False

    return TurnResponse(
        response_text=interviewer_result.response_text,
        action=interviewer_result.action,
        next_question=next_question,
        evaluation=evaluator_result,
        session_complete=session_complete,
    )


@router.patch("/{session_id}")
def update_session(
    session_id: str,
    body: dict,
    user_id: str = Depends(get_current_student),
):
    _get_owned_session(session_id, user_id)
    update_session_status(session_id, body["status"])
    return {"success": True}
