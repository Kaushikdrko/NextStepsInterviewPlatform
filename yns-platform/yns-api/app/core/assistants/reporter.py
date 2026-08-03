from app.core.prompts.reporter_prompt import REPORTER_SYSTEM, build_reporter_prompt
from app.core.schemas.report import SessionReport
from app.core.schemas.student import StudentProfile
from app.services.gemini_client import call_gemini


def _flatten_turn(turn: dict) -> dict:
    question = turn.get("question", {}) or {}
    evaluation = turn.get("evaluation", {}) or {}

    return {
        "id": question.get("id"),
        "category": question.get("category"),
        "difficulty": question.get("difficulty"),
        "overall": evaluation.get("overall"),
        "answer_text": turn.get("answer_text"),
        "notable_strengths": evaluation.get("notable_strengths", []),
        "notable_gaps": evaluation.get("notable_gaps", []),
    }


def generate_report(
    session: dict,
    all_turns: list[dict],
    student_profile: StudentProfile,
) -> SessionReport:
    session_plan = session.get("session_plan") or session
    turn_evaluations = [_flatten_turn(turn) for turn in all_turns]

    prompt = build_reporter_prompt(
        student_profile=student_profile.model_dump(),
        session_plan=session_plan,
        turn_evaluations=turn_evaluations,
    )

    raw = call_gemini(
        contents=prompt,
        system=REPORTER_SYSTEM,
        response_model=SessionReport,
    )

    return SessionReport(**raw)
