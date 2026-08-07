import time

from sqlalchemy.orm import Session

from app.models import Resume
from app.services.profile_store import write_resume_extracted_text
from app.services.resume_parser import parse_resume_pdf
from app.services.supabase_storage import get_supabase_storage_client

"""Resume file bytes stay in Supabase Storage (not part of this migration —
see docs/migration.md); only the ``resumes`` row (Cloud SQL) and the
extracted-text write move with everything else in the onboarding domain.
"""


def _safe_file_name(file_name: str) -> str:
    import re

    cleaned = re.sub(r"[^a-zA-Z0-9._-]", "-", file_name.strip())
    cleaned = re.sub(r"-+", "-", cleaned).strip("-").lower()
    return cleaned


def upload_and_store_resume(
    db: Session,
    user_id: str,
    file_name: str,
    content: bytes,
    mime_type: str | None,
) -> Resume:
    safe_name = _safe_file_name(file_name) or "resume"
    storage_path = f"{user_id}/{int(time.time() * 1000)}-{safe_name}"

    get_supabase_storage_client().storage.from_("resumes").upload(
        storage_path,
        content,
        {
            "content-type": mime_type or "application/octet-stream",
            "cache-control": "3600",
            "upsert": "false",
        },
    )

    resume = Resume(
        user_id=user_id,
        file_name=file_name,
        storage_path=storage_path,
        mime_type=mime_type,
        file_size=len(content),
        extracted_text=None,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume


def try_parse_resume(resume: Resume) -> tuple[str, str | None]:
    """Best-effort parse; failure never blocks the upload. Returns (status, warning)."""
    file_name = resume.file_name or ""
    is_pdf = resume.mime_type == "application/pdf" or file_name.lower().endswith(".pdf")

    if not is_pdf:
        return "skipped", "Resume uploaded. Automatic resume analysis currently supports PDF files only."

    try:
        pdf_bytes = get_supabase_storage_client().storage.from_("resumes").download(
            resume.storage_path
        )
        facts = parse_resume_pdf(pdf_bytes)
        write_resume_extracted_text(resume.id, facts.model_dump_json())
        return "parsed", None
    except Exception as exc:
        return "failed", f"Resume uploaded, but analysis failed: {exc}"
