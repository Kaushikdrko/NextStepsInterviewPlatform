import json

from fastapi import APIRouter, Depends, HTTPException

from app.api.resume.models import ParseResumeRequest, ParseResumeResponse
from app.dependencies import get_current_student
from app.services.profile_store import download_resume_bytes, write_resume_extracted_text
from app.services.resume_parser import parse_resume_pdf

router = APIRouter()


@router.post("/parse", response_model=ParseResumeResponse)
def parse_resume(
    body: ParseResumeRequest | None = None,
    user_id: str = Depends(get_current_student),
):
    try:
        resume, pdf_bytes = download_resume_bytes(user_id, body.resume_id if body else None)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    file_name = resume.get("file_name") or ""
    if resume.get("mime_type") != "application/pdf" and not file_name.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Resume parsing currently supports PDF files only.",
        )

    facts = parse_resume_pdf(pdf_bytes)
    write_resume_extracted_text(resume["id"], json.dumps(facts.model_dump()))
    return ParseResumeResponse(success=True, message="Resume parsed successfully", resume_id=resume["id"])
