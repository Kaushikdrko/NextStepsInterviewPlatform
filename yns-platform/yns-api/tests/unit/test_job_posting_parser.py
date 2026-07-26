from unittest.mock import patch

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


@patch("app.core.assistants.job_posting_parser.call_claude")
def test_parse_returns_job_posting_facts(mock_call_claude):
    mock_call_claude.return_value = RAW_FACTS

    facts = parse_job_posting_text("We are looking for a data engineer...")

    assert isinstance(facts, JobPostingFacts)
    assert facts.required_skills == ["Python", "SQL"]
    assert facts.domain_focus == "data engineering"


@patch("app.core.assistants.job_posting_parser.call_claude")
def test_parse_handles_sparse_posting(mock_call_claude):
    mock_call_claude.return_value = {
        "required_skills": [],
        "responsibilities": [],
    }

    facts = parse_job_posting_text("Short posting with barely any detail.")

    assert facts.required_skills == []
    assert facts.domain_focus is None


@patch("app.core.assistants.job_posting_parser.call_claude")
def test_parse_includes_company_and_title_in_prompt(mock_call_claude):
    mock_call_claude.return_value = RAW_FACTS

    parse_job_posting_text("Posting text.", company="Acme Corp", job_title="Data Engineer")

    sent_messages = mock_call_claude.call_args.kwargs["messages"]
    sent_text = sent_messages[0]["content"][0]["text"]
    assert "Acme Corp" in sent_text
    assert "Data Engineer" in sent_text
