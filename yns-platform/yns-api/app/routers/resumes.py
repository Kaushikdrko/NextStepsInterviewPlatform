from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Resume
from app.schemas.resume import ResumeResponse

router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.get("/user/{user_id}", response_model=ResumeResponse)
def get_resume_for_user(user_id: str, db: Session = Depends(get_db)):
    resume = (
        db.query(Resume)
        .filter(Resume.user_id == user_id)
        .order_by(Resume.created_at.desc().nullslast())
        .first()
    )

    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    return resume
