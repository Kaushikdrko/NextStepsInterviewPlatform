import base64

from app.core.schemas.student import ResumeFacts
from app.services.anthropic_client import call_claude

RESUME_PARSER_SYSTEM = (
    "Extract structured information from this resume PDF. If a field has no "
    "information available, return an empty list or None. Do not invent "
    "information that isn't in the resume."
)

SUBMIT_RESUME_FACTS_TOOL = {
    "name": "submit_resume_facts",
    "description": "Submit the structured facts extracted from the resume.",
    "input_schema": {
        "type": "object",
        "properties": {
            "raw_text": {"type": "string"},
            "experiences": {
                "type": "array",
                "items": {"type": "string"},
            },
            "skills": {
                "type": "array",
                "items": {"type": "string"},
            },
            "education": {
                "type": "array",
                "items": {"type": "string"},
            },
        },
        "required": ["raw_text"],
    },
}


def parse_resume_pdf(pdf_bytes: bytes) -> ResumeFacts:
    b64 = base64.standard_b64encode(pdf_bytes).decode("utf-8")

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": b64,
                    },
                },
                {
                    "type": "text",
                    "text": "Extract the resume information using the provided tool.",
                },
            ],
        }
    ]

    raw = call_claude(
        messages=messages,
        system=RESUME_PARSER_SYSTEM,
        tools=[SUBMIT_RESUME_FACTS_TOOL],
        response_model=ResumeFacts,
    )

    return ResumeFacts(**raw)
