from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.sessions.models import (
    CreateSessionRequest,
    CreateSessionResponse,
    DashboardStatsResponse,
    SessionDetailResponse,
    SessionListResponse,
    SessionSummary,
    SessionTurnDetail,
    SubmitTurnRequest,
    TurnResponse,
    WeeklyProgressResponse,
)
from app.core.assistants.evaluator import evaluate_turn
from app.core.assistants.interviewer import get_interviewer_response
from app.core.assistants.job_posting_parser import parse_job_posting_text
from app.core.assistants.planner import plan_session
from app.core.schemas.session import PlannedQuestion
from app.services.resume_parser import parse_resume_pdf
from app.dependencies import get_current_student
from app.services.supabase_client import (
    build_student_profile,
    download_resume_bytes,
    get_last_n_turns,
    get_latest_resume_metadata,
    get_dashboard_stats_for_user,
    get_session_with_plan,
    get_sessions_for_user,
    get_student_profile,
    get_weekly_progress_for_user,
    get_turns_for_session,
    get_turns_for_sessions,
    update_session_status,
    write_job_posting_parsed_facts,
    write_resume_extracted_text,
    write_session,
    write_turn,
)

router = APIRouter()


def _storage_session_type(session_type: str) -> str:
    # The live database check constraint predates resume-specific sessions.
    # Keep the persisted column compatible while session_plan keeps "resume".
    return "mixed" if session_type == "resume" else session_type


def _load_profile(user_id: str):
    raw = get_student_profile(user_id)
    if raw is None:
        raise HTTPException(status_code=404, detail="Profile not found — complete onboarding first")

    if (
        raw.get("job_posting_id")
        and raw.get("job_posting_description")
        and not raw.get("job_posting_parsed_facts")
    ):
        # Best-effort: an unparseable job posting shouldn't block practice.
        try:
            facts = parse_job_posting_text(
                raw["job_posting_description"],
                company=raw.get("job_posting_company"),
                job_title=raw.get("job_posting_title"),
            )
        except Exception:
            facts = None

        if facts is not None:
            write_job_posting_parsed_facts(raw["job_posting_id"], facts.model_dump())
            raw["job_posting_parsed_facts"] = facts.model_dump()

    return build_student_profile(raw)


def _is_pdf_resume(resume: dict) -> bool:
    file_name = resume.get("file_name") or ""
    return resume.get("mime_type") == "application/pdf" or file_name.lower().endswith(".pdf")


def _ensure_resume_ready_for_session(user_id: str) -> None:
    resume = get_latest_resume_metadata(user_id)

    if resume is None:
        raise HTTPException(
            status_code=400,
            detail="Upload a PDF resume before starting resume-based questions.",
        )

    if resume.get("extracted_text"):
        return

    if not _is_pdf_resume(resume):
        raise HTTPException(
            status_code=400,
            detail="Resume-based questions require a parsed PDF resume. Please upload a PDF resume.",
        )

    try:
        resume_row, pdf_bytes = download_resume_bytes(user_id, resume["id"])
        facts = parse_resume_pdf(pdf_bytes)
        write_resume_extracted_text(resume_row["id"], facts.model_dump_json())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Resume parsing failed. Try uploading the resume again before starting resume-based questions.",
        ) from exc


def _get_owned_session(session_id: str, user_id: str) -> dict:
    session = get_session_with_plan(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")
    return session


def _session_matches_query(session: dict, turns: list[dict], query: str) -> bool:
    normalized_query = query.strip().lower()
    if not normalized_query:
        return True

    session_plan = session["session_plan"]
    searchable_values = [
        session.get("session_type") or "",
        session_plan.get("session_type") or "",
        (session_plan.get("session_type") or "").replace("_", " "),
    ]

    for question in session_plan.get("questions") or []:
        searchable_values.extend(
            [
                question.get("text") or "",
                question.get("intent") or "",
                " ".join(question.get("rubric_focus") or []),
            ]
        )

    for turn in turns:
        question = turn.get("question") or {}
        searchable_values.extend(
            [
                question.get("text") or "",
                turn.get("answer_text") or "",
            ]
        )
        evaluation = turn.get("evaluation") or {}
        searchable_values.extend(evaluation.get("notable_strengths") or [])
        searchable_values.extend(evaluation.get("notable_gaps") or [])

    return normalized_query in " ".join(searchable_values).lower()


def _turn_rating(turn: dict) -> float | None:
    evaluation = turn.get("evaluation")
    if not isinstance(evaluation, dict):
        return None

    rating = evaluation.get("overall")
    return rating if isinstance(rating, (int, float)) else None


def _parse_datetime(value: object) -> datetime | None:
    if isinstance(value, datetime):
        return value

    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None

    return None


def _session_duration_minutes(session: dict) -> int | None:
    start = _parse_datetime(session.get("started_at") or session.get("created_at"))
    end = _parse_datetime(session.get("completed_at"))

    if start is None or end is None or end < start:
        return None

    total_seconds = (end - start).total_seconds()
    return max(1, round(total_seconds / 60)) if total_seconds > 0 else 0


@router.get("/", response_model=SessionListResponse)
def list_sessions(
    q: str | None = Query(default=None, max_length=120),
    user_id: str = Depends(get_current_student),
):
    sessions = get_sessions_for_user(user_id)
    turns_by_session: dict[str, list[dict]] = {}
    has_query = bool(q and q.strip())

    if has_query:
        all_turns = get_turns_for_sessions([session["id"] for session in sessions])
        for turn in all_turns:
            turns_by_session.setdefault(turn["session_id"], []).append(turn)

    summaries = []
    for session in sessions:
        turns = turns_by_session.get(session["id"], []) if has_query else get_turns_for_session(session["id"])
        if has_query and not _session_matches_query(session, turns, q or ""):
            continue

        ratings = [rating for rating in (_turn_rating(t) for t in turns) if rating is not None]
        session_plan = session["session_plan"]

        summaries.append(
            SessionSummary(
                session_id=session["id"],
                session_type=session_plan.get("session_type") or session["session_type"],
                status=session["status"],
                created_at=session["created_at"],
                completed_at=session.get("completed_at"),
                question_count=len(session_plan["questions"]),
                answered_count=len(turns),
                average_rating=(sum(ratings) / len(ratings)) if ratings else None,
                duration_minutes=_session_duration_minutes(session),
            )
        )

    return SessionListResponse(sessions=summaries)


@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(user_id: str = Depends(get_current_student)):
    return DashboardStatsResponse(**get_dashboard_stats_for_user(user_id))


@router.get("/weekly-progress", response_model=WeeklyProgressResponse)
def get_weekly_progress(user_id: str = Depends(get_current_student)):
    return WeeklyProgressResponse(items=get_weekly_progress_for_user(user_id))


@router.get("/{session_id}", response_model=SessionDetailResponse)
def get_session_detail(
    session_id: str,
    user_id: str = Depends(get_current_student),
):
    session = _get_owned_session(session_id, user_id)
    turns = get_turns_for_session(session_id)

    return SessionDetailResponse(
        session_id=session["id"],
        session_type=session["session_plan"].get("session_type") or session["session_type"],
        started_at=session["started_at"],
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
    if body.session_type == "resume":
        _ensure_resume_ready_for_session(user_id)

    profile = _load_profile(user_id)
    plan = plan_session(profile, body.session_type)

    row = write_session(
        {
            "user_id": user_id,
            "session_type": _storage_session_type(body.session_type),
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
