from app.core.schemas.student import JobPostingFacts
from app.services.anthropic_client import call_claude

JOB_POSTING_PARSER_SYSTEM = (
    "Extract structured information from this job posting. If a field has no "
    "information available, return an empty list or None. Do not invent "
    "information that isn't in the posting."
)

SUBMIT_JOB_FACTS_TOOL = {
    "name": "submit_job_facts",
    "description": "Submit the structured facts extracted from the job posting.",
    "input_schema": {
        "type": "object",
        "properties": {
            "required_skills": {
                "type": "array",
                "items": {"type": "string"},
                "maxItems": 20,
            },
            "preferred_skills": {
                "type": "array",
                "items": {"type": "string"},
                "maxItems": 20,
            },
            "responsibilities": {
                "type": "array",
                "items": {"type": "string"},
                "maxItems": 15,
            },
            "seniority_signals": {
                "type": "array",
                "items": {"type": "string"},
                "maxItems": 10,
            },
            "domain_focus": {"type": ["string", "null"]},
            "keywords": {
                "type": "array",
                "items": {"type": "string"},
                "maxItems": 15,
            },
        },
        "required": ["required_skills", "responsibilities"],
    },
}


def parse_job_posting_text(
    posting_text: str,
    company: str | None = None,
    job_title: str | None = None,
) -> JobPostingFacts:
    header_lines = []
    if job_title:
        header_lines.append(f"Job title: {job_title}")
    if company:
        header_lines.append(f"Company: {company}")
    header = "\n".join(header_lines)

    text = f"{header}\n\n{posting_text}" if header else posting_text

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": f"{text}\n\nExtract the job posting information using the provided tool.",
                },
            ],
        }
    ]

    raw = call_claude(
        messages=messages,
        system=JOB_POSTING_PARSER_SYSTEM,
        tools=[SUBMIT_JOB_FACTS_TOOL],
        response_model=JobPostingFacts,
    )

    return JobPostingFacts(**raw)
