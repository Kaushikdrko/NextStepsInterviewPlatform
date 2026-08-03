from google.genai import types

from app.core.schemas.student import ResumeFacts
from app.services.gemini_client import call_gemini

RESUME_PARSER_SYSTEM = (
    "Extract structured information from this resume PDF. If a field has no "
    "information available, return an empty list or None. Do not invent "
    "information that isn't in the resume."
)


def parse_resume_pdf(pdf_bytes: bytes) -> ResumeFacts:
    contents = [
        types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
        types.Part.from_text(text="Extract the resume information."),
    ]

    raw = call_gemini(
        contents=contents,
        system=RESUME_PARSER_SYSTEM,
        response_model=ResumeFacts,
    )

    return ResumeFacts(**raw)
