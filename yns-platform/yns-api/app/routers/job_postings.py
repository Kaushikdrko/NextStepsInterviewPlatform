from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import JobPosting
from app.schemas.job_posting import JobPostingResponse

router = APIRouter(prefix="/job-postings", tags=["job postings"])


@router.get("/user/{user_id}", response_model=JobPostingResponse)
def get_job_posting_for_user(user_id: str, db: Session = Depends(get_db)):
    job_posting = (
        db.query(JobPosting)
        .filter(JobPosting.user_id == user_id)
        .order_by(JobPosting.created_at.desc().nullslast())
        .first()
    )

    if not job_posting:
        raise HTTPException(status_code=404, detail="Job posting not found.")

    return job_posting
