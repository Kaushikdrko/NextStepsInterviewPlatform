from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from app.core.assistants.job_posting_parser import parse_job_posting_text
from app.core.schemas.student import JobPostingFacts

RAW_FACTS = {
    "required_skills": ["Python", "SQL"],
    "preferred_skills": ["Airflow"],
    "responsibilities": ["Build and maintain ETL pipelines"],
    "seniority_signals": ["3+ years", "mentor junior engineers"],
    "domain_focus": "data engineering",
    "keywords": ["distributed systems"],
}


@patch("app.core.assistants.job_posting_parser.call_gemini")
def test_parse_returns_job_posting_facts(mock_call_gemini):
    mock_call_gemini.return_value = RAW_FACTS

    facts = parse_job_posting_text("We are looking for a data engineer...")

    assert isinstance(facts, JobPostingFacts)
    assert facts.required_skills == ["Python", "SQL"]
    assert facts.domain_focus == "data engineering"


@patch("app.core.assistants.job_posting_parser.call_gemini")
def test_parse_handles_sparse_posting(mock_call_gemini):
    mock_call_gemini.return_value = {
        "required_skills": [],
        "responsibilities": [],
    }

    facts = parse_job_posting_text("Short posting with barely any detail.")

    assert facts.required_skills == []
    assert facts.domain_focus is None


@patch("app.core.assistants.job_posting_parser.call_gemini")
def test_parse_includes_company_and_title_in_prompt(mock_call_gemini):
    mock_call_gemini.return_value = RAW_FACTS

    parse_job_posting_text("Posting text.", company="Acme Corp", job_title="Data Engineer")

    sent_prompt = mock_call_gemini.call_args.kwargs["contents"]
    assert "Acme Corp" in sent_prompt
    assert "Data Engineer" in sent_prompt


def _fake_response(parsed: JobPostingFacts | None) -> SimpleNamespace:
    usage = SimpleNamespace(
        prompt_token_count=10, cached_content_token_count=0, candidates_token_count=10
    )
    return SimpleNamespace(parsed=parsed, usage_metadata=usage)


@patch("app.services.gemini_client.get_genai_client")
def test_parse_retries_once_then_raises_on_repeated_invalid_output(mock_get_client):
    # Gemini returns nothing matching the schema — this fails both attempts.
    invalid_response = _fake_response(parsed=None)
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = invalid_response
    mock_get_client.return_value = mock_client

    with pytest.raises(Exception):
        parse_job_posting_text("Some job posting text.")

    assert mock_client.models.generate_content.call_count == 2
