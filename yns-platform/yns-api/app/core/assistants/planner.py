from app.core.prompts.planner_prompt import PLANNER_SYSTEM, build_planner_prompt
from app.core.schemas.session import SessionPlan
from app.core.schemas.student import StudentProfile
from app.services.gemini_client import call_gemini


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


def _summarize_job_posting(student_profile: StudentProfile) -> str | None:
    facts = student_profile.job_posting_facts
    if facts is None:
        return None
    parts = []
    if facts.required_skills:
        parts.append("Required skills: " + ", ".join(facts.required_skills))
    if facts.preferred_skills:
        parts.append("Preferred skills: " + ", ".join(facts.preferred_skills))
    if facts.responsibilities:
        parts.append("Responsibilities: " + "; ".join(facts.responsibilities))
    if facts.seniority_signals:
        parts.append("Seniority signals: " + ", ".join(facts.seniority_signals))
    if facts.domain_focus:
        parts.append("Domain focus: " + facts.domain_focus)
    if facts.keywords:
        parts.append("Other keywords: " + ", ".join(facts.keywords))
    return "\n".join(parts) if parts else None


def plan_session(
    student_profile: StudentProfile,
    session_type: str,
    n_questions: int = 8,
) -> SessionPlan:
    resume_summary = _summarize_resume(student_profile)
    job_posting_summary = _summarize_job_posting(student_profile)

    prompt = build_planner_prompt(
        career_stage=student_profile.career_stage,
        target_role=student_profile.target_role,
        target_level=student_profile.target_level,
        major=student_profile.major,
        target_industry=None,
        interests=student_profile.interests,
        goals=student_profile.goals,
        resume_summary=resume_summary,
        job_posting_summary=job_posting_summary,
        session_type=session_type,
        n_questions=n_questions,
    )

    raw = call_gemini(
        contents=prompt,
        system=PLANNER_SYSTEM,
        response_model=SessionPlan,
    )

    # The requested mode is application state, not a model decision. Preserve it
    # so history can distinguish job-posting sessions from general mixed ones.
    return SessionPlan(**{**raw, "session_type": session_type})
