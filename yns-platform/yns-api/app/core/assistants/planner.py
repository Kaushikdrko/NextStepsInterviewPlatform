from app.core.prompts.planner_prompt import PLANNER_SYSTEM, build_planner_prompt
from app.core.schemas.session import SessionPlan
from app.core.schemas.student import StudentProfile
from app.services.anthropic_client import call_claude

SUBMIT_SESSION_PLAN_TOOL = {
    "name": "submit_session_plan",
    "description": "Submit the planned interview session with all questions.",
    "input_schema": {
        "type": "object",
        "properties": {
            "session_type": {
                "type": "string",
                "enum": ["behavioral", "technical", "mixed"],
            },
            "questions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "category": {
                            "type": "string",
                            "enum": ["behavioral", "technical", "values"],
                        },
                        "difficulty": {
                            "type": "string",
                            "enum": ["warmup", "core", "stretch"],
                        },
                        "text": {"type": "string"},
                        "intent": {"type": "string"},
                        "rubric_focus": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                    },
                    "required": ["id", "category", "difficulty", "text", "intent"],
                },
            },
            "target_minutes": {"type": "integer"},
        },
        "required": ["session_type", "questions"],
    },
}


def _summarize_resume(student_profile: StudentProfile) -> str:
    facts = student_profile.resume_facts
    if facts is None:
        return (
            "No resume uploaded — generate questions based on career stage "
            "and interests only."
        )
    parts = []
    if facts.experiences:
        parts.append("Experience: " + "; ".join(facts.experiences))
    if facts.skills:
        parts.append("Skills: " + ", ".join(facts.skills))
    if facts.education:
        parts.append("Education: " + "; ".join(facts.education))
    return "\n".join(parts) if parts else facts.raw_text


def plan_session(
    student_profile: StudentProfile,
    session_type: str,
    n_questions: int = 8,
) -> SessionPlan:
    resume_summary = _summarize_resume(student_profile)

    prompt = build_planner_prompt(
        career_stage=student_profile.career_stage,
        target_role=student_profile.target_role,
        target_industry=None,
        interests=student_profile.interests,
        goals=student_profile.goals,
        resume_summary=resume_summary,
        session_type=session_type,
        n_questions=n_questions,
    )

    raw = call_claude(
        messages=[{"role": "user", "content": prompt}],
        system=PLANNER_SYSTEM,
        tools=[SUBMIT_SESSION_PLAN_TOOL],
        response_model=SessionPlan,
    )

    return SessionPlan(**raw)
