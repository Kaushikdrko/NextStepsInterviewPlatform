from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_claims
from app.models import AppUser, CareerProfile, JobPosting, OnboardingStatus
from app.schemas.onboarding import OnboardingSubmitRequest, OnboardingSubmitResponse
from app.services.resume_upload import try_parse_resume, upload_and_store_resume

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

_DB_USER_TYPE = {
    "high_school": "high_school",
    "college": "college_student",
    "recent_grad": "recent_graduate",
}


def _current_user(claims: dict[str, Any] = Depends(get_current_claims)) -> tuple[str, str]:
    user_id = claims.get("sub")
    email = claims.get("email")
    if not user_id or not email:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id, email


@router.post("/submit", response_model=OnboardingSubmitResponse)
def submit_onboarding(
    payload: str = Form(...),
    resume_file: UploadFile | None = File(None),
    current_user: tuple[str, str] = Depends(_current_user),
    db: Session = Depends(get_db),
) -> OnboardingSubmitResponse:
    user_id, email = current_user

    try:
        data = OnboardingSubmitRequest.model_validate_json(payload)
    except ValueError as exc:
        return OnboardingSubmitResponse(success=False, error=f"Invalid onboarding payload: {exc}")

    try:
        now = datetime.now(timezone.utc)
        career = data.career_profile
        high_school = data.high_school_profile
        db_user_type = _DB_USER_TYPE[data.user_type]

        app_user = db.get(AppUser, user_id)
        if app_user is None:
            app_user = AppUser(id=user_id, email=email, created_at=now)
            db.add(app_user)
        app_user.email = email
        app_user.name = data.name
        app_user.user_type = db_user_type
        app_user.onboarding_completed = True
        app_user.updated_at = now

        # Must land before career_profile's insert below — SQLAlchemy's
        # flush-ordering only auto-sorts across tables when a relationship()
        # is declared; a bare ForeignKey() column isn't enough, and
        # session autoflush is off (see app/database.py), so without this
        # explicit flush both inserts land in the same batch with
        # unspecified order and can violate the FK.
        db.flush()

        career_profile = (
            db.query(CareerProfile)
            .filter(CareerProfile.user_id == user_id)
            .order_by(CareerProfile.created_at.desc().nullslast())
            .first()
        )
        if career_profile is None:
            career_profile = CareerProfile(user_id=user_id, created_at=now)
            db.add(career_profile)

        career_profile.target_field = (career.target_field if career else None) or (
            high_school.interested_major_or_field if high_school else None
        ) or None
        career_profile.interview_type = high_school.interview_type if high_school else None
        career_profile.skills = career.skills if career else []
        career_profile.major = career.major if career else None
        career_profile.target_level = career.target_level if career else None
        career_profile.target_job_title = None
        career_profile.grade_level = high_school.grade if high_school else None
        career_profile.intended_major = high_school.interested_major_or_field if high_school else None
        career_profile.colleges_preparing_for = high_school.target_colleges if high_school else []
        career_profile.updated_at = now

        db.flush()

        if career and career.has_job_posting:
            job_posting = (
                db.query(JobPosting)
                .filter(JobPosting.user_id == user_id)
                .order_by(JobPosting.created_at.desc().nullslast())
                .first()
            )
            if job_posting is None:
                job_posting = JobPosting(user_id=user_id, created_at=now)
                db.add(job_posting)

            job_posting.company = career.company
            job_posting.job_title = None
            job_posting.job_description = career.job_description
            job_posting.posting_url = career.posting_url or None
            job_posting.updated_at = now
            db.flush()

        onboarding_status = (
            db.query(OnboardingStatus)
            .filter(OnboardingStatus.user_id == user_id)
            .order_by(OnboardingStatus.created_at.desc().nullslast())
            .first()
        )
        if onboarding_status is None:
            onboarding_status = OnboardingStatus(user_id=user_id, created_at=now)
            db.add(onboarding_status)

        onboarding_status.current_step = "completed"
        onboarding_status.completed_at = now
        onboarding_status.updated_at = now
        db.flush()

        if resume_file is not None and resume_file.size:
            content = resume_file.file.read()
            resume = upload_and_store_resume(
                db,
                user_id=user_id,
                file_name=resume_file.filename or "resume",
                content=content,
                mime_type=resume_file.content_type,
            )
            try_parse_resume(resume)

        db.commit()
        return OnboardingSubmitResponse(success=True)
    except Exception as exc:
        db.rollback()
        return OnboardingSubmitResponse(success=False, error=str(exc))
