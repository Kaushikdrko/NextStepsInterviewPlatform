from app.core.schemas.student import JobPostingFacts
from app.services.gemini_client import call_gemini

JOB_POSTING_PARSER_SYSTEM = (
    "Extract structured information from this job posting. If a field has no "
    "information available, return an empty list or None. Do not invent "
    "information that isn't in the posting."
)


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
    prompt = f"{text}\n\nExtract the job posting information."

    raw = call_gemini(
        contents=prompt,
        system=JOB_POSTING_PARSER_SYSTEM,
        response_model=JobPostingFacts,
    )

    return JobPostingFacts(**raw)
