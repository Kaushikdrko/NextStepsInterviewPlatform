from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from fastapi import HTTPException

from app.api.sessions import router as sessions
from app.api.sessions.models import CreateSessionRequest
from app.core.schemas.session import SessionPlan
from app.core.schemas.student import StudentProfile, JobPostingFacts
from app.routers.job_postings import JobPostingUpsertRequest, upsert_current_job_posting
from app.services import job_posting_import as importer


def test_general_behavioral_ignores_saved_posting(monkeypatch):
    monkeypatch.setattr(sessions, "get_student_profile", lambda _: {
        "user_id": "student", "user_type": "college_student",
        "job_posting_id": "old", "job_posting_description": "Old job",
        "job_posting_parsed_facts": {"required_skills": ["old skill"]},
    })
    parser = Mock()
    monkeypatch.setattr(sessions, "parse_job_posting_text", parser)
    profile = sessions._load_profile("student", use_job_posting=False)
    assert profile.job_posting_facts is None
    parser.assert_not_called()


def test_selected_posting_must_belong_to_user(monkeypatch):
    monkeypatch.setattr(sessions, "get_student_profile", lambda *args: {"job_posting_id": None})
    with pytest.raises(HTTPException) as error:
        sessions._load_profile("student", job_posting_id="someone-elses-posting")
    assert error.value.status_code == 404


def test_selected_posting_parse_failure_does_not_silently_generate_generic_questions(monkeypatch):
    monkeypatch.setattr(sessions, "get_student_profile", lambda *args: {
        "job_posting_id": "posting", "job_posting_description": "New description",
    })
    monkeypatch.setattr(sessions, "parse_job_posting_text", Mock(side_effect=RuntimeError("Unavailable")))
    with pytest.raises(HTTPException) as error:
        sessions._load_profile("student", job_posting_id="posting")
    assert error.value.status_code == 502


def test_session_saves_selected_posting_snapshot(monkeypatch):
    facts = JobPostingFacts(company="Acme", job_title="Team lead", responsibilities=["Mentor colleagues"])
    profile = StudentProfile(student_id="student", career_stage="college_student", job_posting_facts=facts)
    load = Mock(return_value=profile)
    monkeypatch.setattr(sessions, "_load_profile", load)
    monkeypatch.setattr(sessions, "plan_session", Mock(return_value=SessionPlan(session_type="behavioral", questions=[])))
    write = Mock(return_value={"id": "session"})
    monkeypatch.setattr(sessions, "write_session", write)
    sessions.create_session(CreateSessionRequest(session_type="behavioral", job_posting_id="posting"), "student")
    load.assert_called_once_with("student", True, "posting")
    assert write.call_args.args[0]["session_plan"]["job_posting_context"]["company"] == "Acme"


@pytest.mark.parametrize("field", ["company", "job_title", "job_description", "posting_url"])
def test_editing_posting_invalidates_cached_facts(field):
    row = SimpleNamespace(company="Acme", job_title="Engineer", job_description="Original", posting_url="https://example.com/job", parsed_facts={"required_skills": ["Old"]})
    db = Mock()
    db.query.return_value.filter.return_value.order_by.return_value.first.return_value = row
    data = {key: getattr(row, key) for key in ("company", "job_title", "job_description", "posting_url")}
    data[field] = "Changed"
    upsert_current_job_posting(JobPostingUpsertRequest(**data), "student", db)
    assert row.parsed_facts is None


def test_unchanged_posting_preserves_cached_facts():
    data = dict(company="Acme", job_title="Engineer", job_description="Original", posting_url="https://example.com/job")
    row = SimpleNamespace(**data, parsed_facts={"required_skills": ["Python"]})
    db = Mock()
    db.query.return_value.filter.return_value.order_by.return_value.first.return_value = row
    upsert_current_job_posting(JobPostingUpsertRequest(**data), "student", db)
    assert row.parsed_facts == {"required_skills": ["Python"]}


@pytest.mark.parametrize("address", ["127.0.0.1", "10.0.0.1", "169.254.169.254", "::1", "::ffff:127.0.0.1"])
def test_import_rejects_private_destinations(monkeypatch, address):
    monkeypatch.setattr(importer.socket, "getaddrinfo", lambda *args, **kwargs: [(2, 1, 6, "", (address, 443))])
    with pytest.raises(ValueError, match="public website"):
        importer.public_destination("https://jobs.example.com/posting")


@pytest.mark.parametrize("url", ["file:///etc/passwd", "https://user:pass@example.com", "http://example.com:8080/job"])
def test_import_rejects_invalid_urls(url):
    with pytest.raises(ValueError):
        importer.public_destination(url)


def test_import_extracts_draft_without_saving(monkeypatch):
    monkeypatch.setattr(importer, "fetch_posting_text", lambda url: "Acme is hiring engineers")
    monkeypatch.setattr(importer, "call_gemini", Mock(return_value={"company": "Acme", "job_title": "Engineer", "job_description": "Build tools"}))
    draft = importer.import_posting("https://example.com/job")
    assert draft.company == "Acme"
    assert draft.posting_url == "https://example.com/job"


def test_import_rejects_blocked_page(monkeypatch):
    monkeypatch.setattr(importer, "fetch_posting_text", lambda url: "Please log in")
    monkeypatch.setattr(importer, "call_gemini", Mock(return_value={"job_description": ""}))
    with pytest.raises(ValueError, match="No job description"):
        importer.import_posting("https://example.com/job")


def test_import_revalidates_redirect_destination(monkeypatch):
    def resolve(host, port, **kwargs):
        address = "127.0.0.1" if host == "internal.example" else "93.184.216.34"
        return [(2, 1, 6, "", (address, port))]
    monkeypatch.setattr(importer.socket, "getaddrinfo", resolve)
    connect = Mock(return_value=Mock())
    monkeypatch.setattr(importer.socket, "create_connection", connect)
    response = Mock(status=302)
    response.getheader.return_value = "http://internal.example/secrets"
    connection = Mock()
    connection.getresponse.return_value = response
    monkeypatch.setattr(importer.http.client, "HTTPConnection", Mock(return_value=connection))
    with pytest.raises(ValueError, match="public website"):
        importer.fetch_posting_text("http://example.com/job")
    connect.assert_called_once_with(("93.184.216.34", 80), timeout=8)
    connection.close.assert_called_once()


def test_import_enforces_response_size_limit(monkeypatch):
    monkeypatch.setattr(importer, "MAX_BYTES", 4)
    monkeypatch.setattr(importer.socket, "getaddrinfo", lambda *a, **kw: [(2, 1, 6, "", ("93.184.216.34", 80))])
    monkeypatch.setattr(importer.socket, "create_connection", Mock(return_value=Mock()))
    response = Mock(status=200)
    response.getheader.return_value = "text/html"
    response.read1.return_value = b"Too large"
    connection = Mock()
    connection.getresponse.return_value = response
    monkeypatch.setattr(importer.http.client, "HTTPConnection", Mock(return_value=connection))
    with pytest.raises(ValueError, match="too large"):
        importer.fetch_posting_text("http://example.com/job")
    connection.close.assert_called_once()
