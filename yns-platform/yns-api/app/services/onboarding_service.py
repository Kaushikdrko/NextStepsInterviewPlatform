from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import AppUser, CareerProfile, JobPosting, Resume
from app.schemas.onboarding_summary import (
    AIContext,
    AvailableContext,
    CareerProfileSummary,
    HighSchoolProfileSummary,
    JobPostingSummary,
    OnboardingSummaryResponse,
    ResumeSummary,
    SummaryUser,
)


def _latest_by_user(db: Session, model: type, user_id: str):
    return (
        db.query(model)
        .filter(model.user_id == user_id)
        .order_by(model.created_at.desc().nullslast())
        .first()
    )


def _join_with_and(items: list[str]) -> str:
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} and {items[1]}"
    return f"{', '.join(items[:-1])}, and {items[-1]}"


def _display_name(user: AppUser) -> str:
    return user.name or user.email.split("@")[0]


def _humanize(value: str | None) -> str:
    return value.replace("_", " ") if value else ""


def get_user_skills(db: Session, user_id: str) -> list[str]:
    profile = _latest_by_user(db, CareerProfile, user_id)
    return profile.skills if profile and profile.skills else []


def get_onboarding_summary(db: Session, user_id: str) -> OnboardingSummaryResponse:
    user = db.get(AppUser, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    skills = get_user_skills(db, user_id)
    resume = _latest_by_user(db, Resume, user_id)
    job_posting = _latest_by_user(db, JobPosting, user_id)
    has_resume = resume is not None
    has_job_posting = job_posting is not None
    has_skills = len(skills) > 0

    summary_user = SummaryUser(
        id=user.id,
        name=user.name,
        email=user.email,
        user_type=user.user_type,
    )

    resume_summary = (
        ResumeSummary(
            id=resume.id,
            created_at=resume.created_at,
            file_name=resume.file_name,
            storage_path=resume.storage_path,
            extracted_text=resume.extracted_text,
        )
        if resume
        else None
    )
    job_posting_summary = (
        JobPostingSummary(
            company=job_posting.company,
            job_title=job_posting.job_title,
            job_description=job_posting.job_description,
            posting_url=job_posting.posting_url,
        )
        if job_posting
        else None
    )

    if user.user_type == "high_school":
        profile = _latest_by_user(db, CareerProfile, user_id)

        if not profile:
            raise HTTPException(status_code=404, detail="Career profile not found.")

        colleges = profile.colleges_preparing_for or []
        college_phrase = _join_with_and(colleges) or "their target colleges"
        candidate_summary = (
            f"{_display_name(user)} is a {profile.grade_level or 'high school'} grade high school student "
            f"preparing for {profile.interview_type or 'college'} interviews for {college_phrase}."
        )

        return OnboardingSummaryResponse(
            user=summary_user,
            profile_type="high_school",
            high_school_profile=HighSchoolProfileSummary(
                grade=profile.grade_level,
                colleges=colleges,
                intended_major=profile.intended_major or profile.target_field,
                interview_type=profile.interview_type,
            ),
            skills=skills,
            resume=resume_summary,
            job_posting=None,
            ai_context=AIContext(
                candidate_summary=candidate_summary,
                interview_focus=(
                    "Generate college interview questions based on the student's grade, colleges, "
                    "intended major, interview type, skills, and resume."
                ),
                available_context=AvailableContext(
                    has_resume=has_resume,
                    has_job_posting=False,
                    has_skills=has_skills,
                ),
            ),
        )

    profile = _latest_by_user(db, CareerProfile, user_id)

    if not profile:
        raise HTTPException(status_code=404, detail="Career profile not found.")

    user_type_label = "college student" if user.user_type in ("college", "college_student") else "recent graduate"
    target_level = _humanize(profile.target_level)
    target_phrase = " ".join(part for part in [profile.target_field, target_level] if part)
    candidate_summary = (
        f"{_display_name(user)} is a {user_type_label} majoring in {profile.major or 'their field'} "
        f"preparing for a {target_phrase or 'career'} interview."
    )

    return OnboardingSummaryResponse(
        user=summary_user,
        profile_type="career",
        career_profile=CareerProfileSummary(
            major=profile.major,
            target_field=profile.target_field,
            target_level=profile.target_level,
        ),
        skills=skills,
        resume=resume_summary,
        job_posting=job_posting_summary,
        ai_context=AIContext(
            candidate_summary=candidate_summary,
            interview_focus=(
                "Generate interview questions based on the user's major, target field, target level, "
                "skills, resume, and job posting."
            ),
            available_context=AvailableContext(
                has_resume=has_resume,
                has_job_posting=has_job_posting,
                has_skills=has_skills,
            ),
        ),
    )
