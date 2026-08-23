import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock

import pytest

from app.models import SpeechTranscriptionJob
from app.services.transcription_jobs import (
    COMPLETED,
    JOB_RETENTION,
    MAX_AUDIO_DURATION_MS,
    MAX_AUDIO_SIZE_BYTES,
    PROCESSING,
    InvalidTranscriptionJobTransition,
    build_voice_object_path,
    create_transcription_job,
    mark_transcription_completed,
    mark_transcription_failed,
    mark_transcription_processing,
    purge_expired_transcription_jobs,
)


USER_ID = "239480b0-bb7a-4beb-85d5-ed5d50a3c1b3"
SESSION_ID = "47261ccc-a824-4526-9150-b37fbeb640d9"


def test_object_path_is_server_controlled_and_scoped_to_user_and_session():
    job_id = str(uuid.uuid4())

    assert build_voice_object_path(USER_ID, SESSION_ID, job_id) == (
        f"transcriptions/{USER_ID}/{SESSION_ID}/{job_id}.wav"
    )


def test_invalid_path_identifier_is_rejected():
    with pytest.raises(ValueError):
        build_voice_object_path("../../another-user", SESSION_ID, str(uuid.uuid4()))


def test_create_job_sets_private_metadata_and_24_hour_expiry():
    db = Mock()
    now = datetime(2026, 8, 23, 12, 0, tzinfo=timezone.utc)

    job = create_transcription_job(
        db,
        user_id=USER_ID,
        session_id=SESSION_ID,
        audio_size_bytes=1_000_000,
        audio_duration_ms=180_000,
        now=now,
    )

    assert job.status == "pending"
    assert job.storage_path.startswith(f"transcriptions/{USER_ID}/{SESSION_ID}/")
    assert job.storage_path.endswith(".wav")
    assert job.transcript is None
    assert job.expires_at == now + JOB_RETENTION
    db.add.assert_called_once_with(job)
    db.flush.assert_called_once_with()


@pytest.mark.parametrize(
    ("size", "duration"),
    [
        (0, 1_000),
        (MAX_AUDIO_SIZE_BYTES + 1, 1_000),
        (1_000, 0),
        (1_000, MAX_AUDIO_DURATION_MS + 1),
    ],
)
def test_create_job_rejects_audio_outside_limits(size: int, duration: int):
    with pytest.raises(ValueError):
        create_transcription_job(
            Mock(),
            user_id=USER_ID,
            session_id=SESSION_ID,
            audio_size_bytes=size,
            audio_duration_ms=duration,
        )


def test_processing_job_can_complete_with_trimmed_transcript():
    db = Mock()
    job = _job()
    mark_transcription_processing(db, job, operation_name="projects/p/operations/123")
    assert job.status == PROCESSING

    finished_at = datetime(2026, 8, 23, 13, 0, tzinfo=timezone.utc)
    mark_transcription_completed(
        db,
        job,
        transcript="  My interview answer.  ",
        now=finished_at,
    )

    assert job.status == COMPLETED
    assert job.transcript == "My interview answer."
    assert job.completed_at == finished_at


def test_terminal_job_cannot_be_reprocessed():
    db = Mock()
    job = _job(status=COMPLETED)

    with pytest.raises(InvalidTranscriptionJobTransition):
        mark_transcription_processing(db, job, operation_name="projects/p/operations/456")


def test_failed_job_keeps_only_a_short_safe_message():
    db = Mock()
    job = _job(status=PROCESSING)

    mark_transcription_failed(db, job, safe_error_message="  Please   retry.  " + "x" * 600)

    assert job.status == "failed"
    assert job.transcript is None
    assert job.error_message.startswith("Please retry.")
    assert len(job.error_message) == 500


def test_model_has_database_ownership_and_expiry_indexes():
    table = SpeechTranscriptionJob.__table__
    assert table.c.user_id.foreign_keys
    assert table.c.session_id.foreign_keys
    assert table.c.expires_at.nullable is False
    assert {
        "speech_transcription_jobs_user_session_idx",
        "speech_transcription_jobs_status_expires_idx",
    }.issubset({index.name for index in table.indexes})


def test_purge_expired_jobs_removes_metadata_and_returns_gcs_paths():
    expired = _job()
    query = Mock()
    query.filter.return_value = query
    query.order_by.return_value = query
    query.limit.return_value = query
    query.all.return_value = [expired]
    db = Mock()
    db.query.return_value = query

    artifacts = purge_expired_transcription_jobs(
        db,
        now=datetime.now(timezone.utc),
    )

    assert len(artifacts) == 1
    assert artifacts[0].storage_path == expired.storage_path
    assert artifacts[0].operation_name is None
    query.limit.assert_called_once_with(100)
    db.delete.assert_called_once_with(expired)
    db.flush.assert_called_once_with()


def _job(status: str = "pending") -> SpeechTranscriptionJob:
    now = datetime.now(timezone.utc)
    return SpeechTranscriptionJob(
        id=str(uuid.uuid4()),
        user_id=USER_ID,
        session_id=SESSION_ID,
        storage_path="transcriptions/test.wav",
        status=status,
        audio_size_bytes=1_000,
        audio_duration_ms=10_000,
        created_at=now,
        updated_at=now,
        expires_at=now + timedelta(hours=24),
    )
