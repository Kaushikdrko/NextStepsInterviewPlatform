import io
import uuid
import wave
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

from app.api.speech import router as speech_router
from app.database import get_db
from app.dependencies import get_current_student
from app.main import app
from app.models import SpeechTranscriptionJob
from app.services.speech_transcription import SpeechTranscriptionError, TranscriptionResult

USER_ID = "239480b0-bb7a-4beb-85d5-ed5d50a3c1b3"
SESSION_ID = "47261ccc-a824-4526-9150-b37fbeb640d9"
JOB_ID = "11111111-1111-4111-8111-111111111111"
URL = f"/api/sessions/{SESSION_ID}/transcriptions"
JOB_URL = f"{URL}/{JOB_ID}"


def _wav_bytes(duration_seconds: int = 1) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as recording:
        recording.setnchannels(1)
        recording.setsampwidth(2)
        recording.setframerate(16_000)
        recording.writeframes(bytes(16_000 * 2 * duration_seconds))
    return buffer.getvalue()


def _query(first_result):
    query = Mock()
    query.filter.return_value = query
    query.with_for_update.return_value = query
    query.first.return_value = first_result
    return query


def _db(*, owned_session=True, active_job=None):
    db = Mock()
    db.query.side_effect = [
        _query(object() if owned_session else None),
        _query(active_job),
    ]
    return db


@pytest.fixture
def client():
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def disable_expired_cleanup(monkeypatch):
    monkeypatch.setattr(speech_router, "_cleanup_expired_jobs", lambda _db: None)


def _authorize(db):
    app.dependency_overrides[get_current_student] = lambda: USER_ID
    app.dependency_overrides[get_db] = lambda: db


def _job(
    status: str = "processing",
    *,
    operation_name: str | None = "projects/test/operations/123",
) -> SpeechTranscriptionJob:
    now = datetime.now(timezone.utc)
    return SpeechTranscriptionJob(
        id=JOB_ID,
        user_id=USER_ID,
        session_id=SESSION_ID,
        storage_path=f"transcriptions/{USER_ID}/{SESSION_ID}/{JOB_ID}.wav",
        operation_name=operation_name,
        status=status,
        audio_size_bytes=len(_wav_bytes()),
        audio_duration_ms=1_000,
        created_at=now,
        updated_at=now,
        expires_at=now + timedelta(hours=24),
    )


def test_anonymous_upload_is_rejected(client):
    response = client.post(
        URL,
        files={"file": ("answer.wav", _wav_bytes(), "audio/wav")},
    )
    assert response.status_code == 401


def test_session_must_belong_to_current_user(client):
    _authorize(_db(owned_session=False))
    response = client.post(
        URL,
        files={"file": ("answer.wav", _wav_bytes(), "audio/wav")},
    )
    assert response.status_code == 404


def test_non_wav_content_type_is_rejected(client):
    _authorize(_db())
    response = client.post(
        URL,
        files={"file": ("answer.mp3", b"not audio", "audio/mpeg")},
    )
    assert response.status_code == 415


def test_malformed_wav_is_rejected(client):
    _authorize(_db())
    response = client.post(
        URL,
        files={"file": ("answer.wav", b"not a wav", "audio/wav")},
    )
    assert response.status_code == 400


def test_second_active_job_is_rejected(client):
    _authorize(_db(active_job=object()))
    response = client.post(
        URL,
        files={"file": ("answer.wav", _wav_bytes(), "audio/wav")},
    )
    assert response.status_code == 409


def test_valid_audio_starts_private_transcription(client, monkeypatch):
    db = _db()
    _authorize(db)
    now = datetime.now(timezone.utc)
    job = SpeechTranscriptionJob(
        id=str(uuid.uuid4()),
        user_id=USER_ID,
        session_id=SESSION_ID,
        storage_path=f"transcriptions/{USER_ID}/{SESSION_ID}/job.wav",
        status="pending",
        audio_size_bytes=len(_wav_bytes()),
        audio_duration_ms=1_000,
        created_at=now,
        updated_at=now,
        expires_at=now + timedelta(hours=24),
    )

    monkeypatch.setattr(speech_router, "create_transcription_job", lambda *_args, **_kwargs: job)
    upload = Mock(return_value="gs://private-bucket/private.wav")
    start = Mock(return_value="projects/test/operations/123")
    monkeypatch.setattr(speech_router, "upload_audio", upload)
    monkeypatch.setattr(speech_router, "start_transcription", start)

    response = client.post(
        URL,
        files={"file": ("answer.wav", _wav_bytes(), "audio/wav")},
    )

    assert response.status_code == 202
    assert response.json()["status"] == "processing"
    assert "storage_path" not in response.json()
    assert "operation_name" not in response.json()
    upload.assert_called_once()
    start.assert_called_once_with("gs://private-bucket/private.wav")


def test_anonymous_poll_and_cancel_are_rejected(client):
    assert client.get(JOB_URL).status_code == 401
    assert client.delete(JOB_URL).status_code == 401


def test_poll_only_returns_jobs_owned_by_current_user(client, monkeypatch):
    _authorize(Mock())
    monkeypatch.setattr(speech_router, "get_owned_transcription_job", Mock(return_value=None))

    assert client.get(JOB_URL).status_code == 404


def test_poll_returns_processing_while_google_is_not_done(client, monkeypatch):
    job = _job()
    _authorize(Mock())
    monkeypatch.setattr(speech_router, "get_owned_transcription_job", Mock(return_value=job))
    poll = Mock(return_value=TranscriptionResult(done=False))
    monkeypatch.setattr(speech_router, "poll_transcription", poll)

    response = client.get(JOB_URL)

    assert response.status_code == 200
    assert response.json()["status"] == "processing"
    assert response.json()["transcript"] is None
    poll.assert_called_once_with(job.operation_name)


def test_poll_persists_transcript_and_deletes_audio_when_done(client, monkeypatch):
    job = _job()
    db = Mock()
    _authorize(db)
    monkeypatch.setattr(speech_router, "get_owned_transcription_job", Mock(return_value=job))
    monkeypatch.setattr(
        speech_router,
        "poll_transcription",
        Mock(return_value=TranscriptionResult(done=True, transcript="My answer.")),
    )
    delete = Mock()
    monkeypatch.setattr(speech_router, "delete_audio", delete)

    response = client.get(JOB_URL)

    assert response.status_code == 200
    assert response.json()["status"] == "completed"
    assert response.json()["transcript"] == "My answer."
    assert "operation_name" not in response.json()
    db.commit.assert_called_once_with()
    delete.assert_called_once_with(job.storage_path)


def test_terminal_speech_failure_returns_only_safe_error(client, monkeypatch):
    job = _job()
    _authorize(Mock())
    monkeypatch.setattr(speech_router, "get_owned_transcription_job", Mock(return_value=job))
    monkeypatch.setattr(
        speech_router,
        "poll_transcription",
        Mock(side_effect=SpeechTranscriptionError("provider detail")),
    )
    monkeypatch.setattr(speech_router, "delete_audio", Mock())

    response = client.get(JOB_URL)

    assert response.status_code == 200
    assert response.json()["status"] == "failed"
    assert response.json()["error"] == (
        "Transcription failed. Please record your answer again."
    )
    assert "provider detail" not in response.text


def test_temporary_poll_failure_can_be_retried(client, monkeypatch):
    job = _job()
    _authorize(Mock())
    monkeypatch.setattr(speech_router, "get_owned_transcription_job", Mock(return_value=job))
    monkeypatch.setattr(
        speech_router,
        "poll_transcription",
        Mock(side_effect=RuntimeError("temporary outage")),
    )

    response = client.get(JOB_URL)

    assert response.status_code == 503
    assert job.status == "processing"
    assert "temporary outage" not in response.text


def test_processing_job_can_be_cancelled(client, monkeypatch):
    job = _job()
    db = Mock()
    _authorize(db)
    monkeypatch.setattr(speech_router, "get_owned_transcription_job", Mock(return_value=job))
    cancel = Mock()
    delete = Mock()
    monkeypatch.setattr(speech_router, "cancel_transcription", cancel)
    monkeypatch.setattr(speech_router, "delete_audio", delete)

    response = client.delete(JOB_URL)

    assert response.status_code == 204
    assert job.status == "cancelled"
    cancel.assert_called_once_with(job.operation_name)
    delete.assert_called_once_with(job.storage_path)
    db.commit.assert_called_once_with()


def test_completed_job_cannot_be_cancelled(client, monkeypatch):
    job = _job(status="completed")
    _authorize(Mock())
    monkeypatch.setattr(speech_router, "get_owned_transcription_job", Mock(return_value=job))

    response = client.delete(JOB_URL)

    assert response.status_code == 409
