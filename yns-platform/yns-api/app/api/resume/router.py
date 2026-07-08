import json

from fastapi import APIRouter, Depends

from app.api.resume.models import ParseResumeResponse
from app.dependencies import get_current_student
from app.services.resume_parser import parse_resume_pdf
from app.services.supabase_client import download_resume_bytes, write_resume_extracted_text

router = APIRouter()


@router.post("/parse", response_model=ParseResumeResponse)
def parse_resume(user_id: str = Depends(get_current_student)):
    pdf_bytes = download_resume_bytes(user_id)
    facts = parse_resume_pdf(pdf_bytes)
    write_resume_extracted_text(user_id, json.dumps(facts.model_dump()))
    return ParseResumeResponse(success=True, message="Resume parsed successfully")
