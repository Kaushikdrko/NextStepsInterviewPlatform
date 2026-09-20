from datetime import datetime, timezone
from typing import Any

from app.core.schemas.student import JobPostingFacts, ResumeFacts, StudentProfile
from app.database import SessionLocal
from app.models import AppUser, CareerProfile, JobPosting, Resume
from app.services.supabase_storage import get_supabase_storage_client

"""Cloud SQL access for profile, job-posting, and resume metadata.

Resume file bytes remain in the legacy storage bucket for now; all relational
profile and interview data is stored in Cloud SQL.
"""


def get_student_profile(user_id: str, job_posting_id: str | None = None) -> dict[str, Any] | None:
    with SessionLocal() as db:
        user = db.get(AppUser, user_id)
        if user is None:
            return None

        career = (
            db.query(CareerProfile)
            .filter(CareerProfile.user_id == user_id)
            .order_by(CareerProfile.created_at.desc().nullslast())
            .first()
        )
        if career is None:
            return None

        resume = (
            db.query(Resume)
            .filter(Resume.user_id == user_id)
            .order_by(Resume.created_at.desc().nullslast())
            .first()
        )
        job_posting = (
            db.query(JobPosting)
            .filter(JobPosting.user_id == user_id)
            .filter(JobPosting.id == job_posting_id if job_posting_id else True)
            .order_by(JobPosting.created_at.desc().nullslast())
            .first()
        )

        return {
            "user_id": user_id,
            "user_type": user.user_type,
            "target_field": career.target_field,
            "target_job_title": career.target_job_title,
            "target_level": career.target_level,
            "skills": career.skills or [],
            "major": career.major,
            "grade_level": career.grade_level,
            "intended_major": career.intended_major,
            "colleges_preparing_for": career.colleges_preparing_for or [],
            "extracted_text": resume.extracted_text if resume else None,
            "job_posting_id": job_posting.id if job_posting else None,
            "job_posting_company": job_posting.company if job_posting else None,
            "job_posting_title": job_posting.job_title if job_posting else None,
            "job_posting_description": job_posting.job_description if job_posting else None,
            "job_posting_parsed_facts": job_posting.parsed_facts if job_posting else None,
        }


def build_student_profile(raw: dict[str, Any]) -> StudentProfile:
    if raw["user_type"] == "high_school":
        target_role = raw.get("intended_major")
        interests = raw.get("colleges_preparing_for") or []
        major = raw.get("intended_major")
    else:
        target_role = raw.get("target_job_title") or raw.get("target_field")
        interests = raw.get("skills") or []
        major = raw.get("major")

    resume_facts = None
    if raw.get("extracted_text"):
        resume_facts = ResumeFacts.model_validate_json(raw["extracted_text"])

    job_posting_facts = None
    if raw.get("job_posting_parsed_facts"):
        job_posting_facts = JobPostingFacts(**{**raw["job_posting_parsed_facts"], "company": raw.get("job_posting_company"), "job_title": raw.get("job_posting_title")})

    return StudentProfile(
        student_id=raw["user_id"],
        career_stage=raw["user_type"],
        target_role=target_role,
        target_level=raw.get("target_level"),
        major=major,
        interests=interests,
        resume_facts=resume_facts,
        job_posting_facts=job_posting_facts,
    )


def get_latest_resume_metadata(user_id: str) -> dict[str, Any] | None:
    with SessionLocal() as db:
        resume = (
            db.query(Resume)
            .filter(Resume.user_id == user_id)
            .order_by(Resume.created_at.desc().nullslast())
            .first()
        )
        if resume is None:
            return None

        return {
            "id": resume.id,
            "storage_path": resume.storage_path,
            "mime_type": resume.mime_type,
            "file_name": resume.file_name,
            "extracted_text": resume.extracted_text,
        }


def download_resume_bytes(user_id: str, resume_id: str | None = None) -> tuple[dict[str, Any], bytes]:
    with SessionLocal() as db:
        query = db.query(Resume).filter(Resume.user_id == user_id)
        resume = (
            query.filter(Resume.id == resume_id).first()
            if resume_id
            else query.order_by(Resume.created_at.desc().nullslast()).first()
        )

        if resume is None:
            raise ValueError("Resume not found")

        resume_dict = {
            "id": resume.id,
            "storage_path": resume.storage_path,
            "mime_type": resume.mime_type,
            "file_name": resume.file_name,
            "extracted_text": resume.extracted_text,
        }

    pdf_bytes = get_supabase_storage_client().storage.from_("resumes").download(
        resume_dict["storage_path"]
    )
    return resume_dict, pdf_bytes


def write_resume_extracted_text(resume_id: str, extracted_text: str) -> None:
    with SessionLocal() as db:
        resume = db.get(Resume, resume_id)
        if resume is None:
            return
        resume.extracted_text = extracted_text
        db.commit()


def write_job_posting_parsed_facts(job_posting_id: str, parsed_facts: dict[str, Any]) -> None:
    with SessionLocal() as db:
        job_posting = db.get(JobPosting, job_posting_id)
        if job_posting is None:
            return
        job_posting.parsed_facts = parsed_facts
        job_posting.updated_at = datetime.now(timezone.utc)
        db.commit()
