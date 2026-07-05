from app.core.prompts.reporter_prompt import REPORTER_SYSTEM, build_reporter_prompt
from app.core.schemas.report import SessionReport
from app.core.schemas.student import StudentProfile
from app.services.anthropic_client import call_claude

SUBMIT_REPORT_TOOL = {
    "name": "submit_report",
    "description": "Submit the full synthesized session report.",
    "input_schema": {
        "type": "object",
        "properties": {
            "overall": {"type": "integer", "minimum": 1, "maximum": 5},
            "category_breakdown": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "category": {
                            "type": "string",
                            "enum": ["behavioral", "technical", "values"],
                        },
                        "score": {"type": "integer", "minimum": 1, "maximum": 5},
                        "notes": {"type": "string"},
                    },
                    "required": ["category", "score", "notes"],
                },
            },
            "strengths": {
                "type": "array",
                "items": {"type": "string"},
                "minItems": 2,
                "maxItems": 3,
            },
            "growth_areas": {
                "type": "array",
                "items": {"type": "string"},
                "minItems": 2,
                "maxItems": 3,
            },
            "recommended_next_steps": {
                "type": "array",
                "items": {"type": "string"},
                "minItems": 3,
                "maxItems": 3,
            },
        },
        "required": [
            "overall",
            "category_breakdown",
            "strengths",
            "growth_areas",
            "recommended_next_steps",
        ],
    },
}


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

    raw = call_claude(
        messages=[{"role": "user", "content": prompt}],
        system=REPORTER_SYSTEM,
        tools=[SUBMIT_REPORT_TOOL],
        response_model=SessionReport,
    )

    return SessionReport(**raw)
