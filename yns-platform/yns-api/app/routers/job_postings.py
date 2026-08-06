from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_student, require_user_ownership
from app.models import JobPosting
from app.schemas.job_posting import JobPostingResponse

router = APIRouter(prefix="/job-postings", tags=["job postings"])


class JobPostingUpsertRequest(BaseModel):
    company: str = ""
    job_title: str = ""
    job_description: str = ""
    posting_url: str = ""


@router.post("", response_model=JobPostingResponse)
def upsert_current_job_posting(
    body: JobPostingUpsertRequest,
    user_id: str = Depends(get_current_student),
    db: Session = Depends(get_db),
) -> JobPosting:
    now = datetime.now(timezone.utc)
    job_posting = (
        db.query(JobPosting)
        .filter(JobPosting.user_id == user_id)
        .order_by(JobPosting.created_at.desc().nullslast())
        .first()
    )
    if job_posting is None:
        job_posting = JobPosting(user_id=user_id, created_at=now)
        db.add(job_posting)

    job_posting.company = body.company.strip() or None
    job_posting.job_title = body.job_title.strip() or None
    job_posting.job_description = body.job_description.strip() or None
    job_posting.posting_url = body.posting_url.strip() or None
    job_posting.updated_at = now

    db.commit()
    db.refresh(job_posting)
    return job_posting


@router.get("/user/{user_id}", response_model=JobPostingResponse)
def get_job_posting_for_user(
    user_id: str,
    current_user_id: str = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    require_user_ownership(user_id, current_user_id)
    job_posting = (
        db.query(JobPosting)
        .filter(JobPosting.user_id == user_id)
        .order_by(JobPosting.created_at.desc().nullslast())
        .first()
    )

    if not job_posting:
        raise HTTPException(status_code=404, detail="Job posting not found.")

    return job_posting
