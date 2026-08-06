from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_student, require_user_ownership
from app.models import Resume
from app.schemas.resume import ResumeResponse
from app.services.resume_upload import try_parse_resume, upload_and_store_resume

router = APIRouter(prefix="/resumes", tags=["resumes"])

# Mirrors yns-web/lib/validations/onboarding.ts's allowedResumeMimeTypes.
ALLOWED_RESUME_MIME_TYPES = frozenset(
    {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
)


class UploadResumeResponse(BaseModel):
    success: bool
    file_name: str | None = None
    parse_status: str | None = None
    parse_warning: str | None = None
    error: str | None = None


@router.post("", response_model=UploadResumeResponse)
def upload_resume(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_student),
    db: Session = Depends(get_db),
) -> UploadResumeResponse:
    if file.content_type not in ALLOWED_RESUME_MIME_TYPES:
        return UploadResumeResponse(success=False, error="Resume must be a PDF, DOC, or DOCX file.")

    try:
        content = file.file.read()
        resume = upload_and_store_resume(
            db,
            user_id=user_id,
            file_name=file.filename or "resume",
            content=content,
            mime_type=file.content_type,
        )
        parse_status, parse_warning = try_parse_resume(resume)
        return UploadResumeResponse(
            success=True,
            file_name=resume.file_name,
            parse_status=parse_status,
            parse_warning=parse_warning,
        )
    except Exception as exc:
        db.rollback()
        return UploadResumeResponse(success=False, error=str(exc))


@router.get("/user/{user_id}", response_model=ResumeResponse)
def get_resume_for_user(
    user_id: str,
    current_user_id: str = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    require_user_ownership(user_id, current_user_id)
    resume = (
        db.query(Resume)
        .filter(Resume.user_id == user_id)
        .order_by(Resume.created_at.desc().nullslast())
        .first()
    )

    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    return resume
