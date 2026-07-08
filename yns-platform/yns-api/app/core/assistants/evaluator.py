from app.core.prompts.evaluator_prompt import EVALUATOR_SYSTEM, build_evaluator_prompt
from app.core.schemas.evaluation import TurnEvaluation
from app.core.schemas.session import PlannedQuestion
from app.core.schemas.student import StudentProfile
from app.services.anthropic_client import call_claude

SUBMIT_EVALUATION_TOOL = {
    "name": "submit_evaluation",
    "description": "Submit the scored evaluation for one interview answer.",
    "input_schema": {
        "type": "object",
        "properties": {
            "dimensions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "score": {"type": "integer", "minimum": 1, "maximum": 5},
                        "rationale": {"type": "string"},
                        "quote": {"type": ["string", "null"]},
                    },
                    "required": ["name", "score", "rationale"],
                },
            },
            "overall": {"type": "integer", "minimum": 1, "maximum": 5},
            "notable_strengths": {
                "type": "array",
                "items": {"type": "string"},
                "minItems": 1,
                "maxItems": 2,
            },
            "notable_gaps": {
                "type": "array",
                "items": {"type": "string"},
                "minItems": 1,
                "maxItems": 2,
            },
        },
        "required": ["dimensions", "overall", "notable_strengths", "notable_gaps"],
    },
}


def _passion_summary(student_profile: StudentProfile) -> str:
    role = student_profile.target_role or "unspecified role"
    goals = ", ".join(student_profile.goals) if student_profile.goals else "none stated"
    return f"{role}. Goals: {goals}"


def evaluate_turn(
    question: PlannedQuestion,
    answer_text: str,
    student_profile: StudentProfile,
) -> TurnEvaluation:
    prompt = build_evaluator_prompt(
        question_text=question.text,
        question_category=question.category,
        rubric_focus=question.rubric_focus,
        answer_text=answer_text,
        student_passion_summary=_passion_summary(student_profile),
    )

    raw = call_claude(
        messages=[{"role": "user", "content": prompt}],
        system=EVALUATOR_SYSTEM,
        tools=[SUBMIT_EVALUATION_TOOL],
        response_model=TurnEvaluation,
    )

    return TurnEvaluation(**raw)
