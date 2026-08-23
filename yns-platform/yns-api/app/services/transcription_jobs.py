import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import SpeechTranscriptionJob

MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024
MAX_AUDIO_DURATION_MS = 5 * 60 * 1000
JOB_RETENTION = timedelta(hours=24)

PENDING = "pending"
PROCESSING = "processing"
COMPLETED = "completed"
FAILED = "failed"
CANCELLED = "cancelled"

_ALLOWED_TRANSITIONS = {
    PENDING: frozenset({PROCESSING, FAILED, CANCELLED}),
    PROCESSING: frozenset({COMPLETED, FAILED, CANCELLED}),
    COMPLETED: frozenset(),
    FAILED: frozenset(),
    CANCELLED: frozenset(),
}


class InvalidTranscriptionJobTransition(ValueError):
    pass


@dataclass(frozen=True)
class ExpiredTranscriptionArtifact:
    storage_path: str
    operation_name: str | None


def build_voice_object_path(user_id: str, session_id: str, job_id: str) -> str:
    """Build a server-controlled object path; never accept a client path."""
    normalized = [str(uuid.UUID(value)) for value in (user_id, session_id, job_id)]
    return f"transcriptions/{normalized[0]}/{normalized[1]}/{normalized[2]}.wav"


def create_transcription_job(
    db: Session,
    *,
    user_id: str,
    session_id: str,
    audio_size_bytes: int,
    audio_duration_ms: int,
    now: datetime | None = None,
) -> SpeechTranscriptionJob:
    if not 0 < audio_size_bytes <= MAX_AUDIO_SIZE_BYTES:
        raise ValueError("Audio must be between 1 byte and 25 MiB.")
    if not 0 < audio_duration_ms <= MAX_AUDIO_DURATION_MS:
        raise ValueError("Audio must be between 1 millisecond and 5 minutes.")

    created_at = now or datetime.now(timezone.utc)
    job_id = str(uuid.uuid4())
    job = SpeechTranscriptionJob(
        id=job_id,
        user_id=user_id,
        session_id=session_id,
        storage_path=build_voice_object_path(user_id, session_id, job_id),
        status=PENDING,
        audio_size_bytes=audio_size_bytes,
        audio_duration_ms=audio_duration_ms,
        created_at=created_at,
        updated_at=created_at,
        expires_at=created_at + JOB_RETENTION,
    )
    db.add(job)
    db.flush()
    return job


def get_owned_transcription_job(
    db: Session,
    *,
    job_id: str,
    user_id: str,
    session_id: str,
) -> SpeechTranscriptionJob | None:
    return (
        db.query(SpeechTranscriptionJob)
        .filter(
            SpeechTranscriptionJob.id == job_id,
            SpeechTranscriptionJob.user_id == user_id,
            SpeechTranscriptionJob.session_id == session_id,
        )
        .first()
    )


def purge_expired_transcription_jobs(
    db: Session,
    *,
    now: datetime | None = None,
) -> list[ExpiredTranscriptionArtifact]:
    """Delete expired metadata and return information for cloud cleanup."""
    cutoff = now or datetime.now(timezone.utc)
    expired_jobs = (
        db.query(SpeechTranscriptionJob)
        .filter(SpeechTranscriptionJob.expires_at <= cutoff)
        .order_by(SpeechTranscriptionJob.expires_at.asc())
        .limit(100)
        .all()
    )

    artifacts = [
        ExpiredTranscriptionArtifact(
            storage_path=job.storage_path,
            operation_name=job.operation_name,
        )
        for job in expired_jobs
    ]

    for job in expired_jobs:
        db.delete(job)

    db.flush()
    return artifacts


def mark_transcription_processing(
    db: Session,
    job: SpeechTranscriptionJob,
    *,
    operation_name: str,
    now: datetime | None = None,
) -> SpeechTranscriptionJob:
    if not operation_name.strip():
        raise ValueError("Speech operation name is required.")
    _transition(job, PROCESSING, now=now)
    job.operation_name = operation_name
    db.flush()
    return job


def mark_transcription_completed(
    db: Session,
    job: SpeechTranscriptionJob,
    *,
    transcript: str,
    now: datetime | None = None,
) -> SpeechTranscriptionJob:
    cleaned_transcript = transcript.strip()
    if not cleaned_transcript:
        raise ValueError("A completed transcription must contain text.")
    completed_at = now or datetime.now(timezone.utc)
    _transition(job, COMPLETED, now=completed_at)
    job.transcript = cleaned_transcript
    job.completed_at = completed_at
    job.error_message = None
    db.flush()
    return job


def mark_transcription_failed(
    db: Session,
    job: SpeechTranscriptionJob,
    *,
    safe_error_message: str,
    now: datetime | None = None,
) -> SpeechTranscriptionJob:
    _transition(job, FAILED, now=now)
    cleaned = " ".join(safe_error_message.split())
    job.error_message = (cleaned or "Transcription failed. Please try again.")[:500]
    job.transcript = None
    db.flush()
    return job


def mark_transcription_cancelled(
    db: Session,
    job: SpeechTranscriptionJob,
    *,
    now: datetime | None = None,
) -> SpeechTranscriptionJob:
    _transition(job, CANCELLED, now=now)
    job.transcript = None
    job.error_message = None
    db.flush()
    return job


def _transition(
    job: SpeechTranscriptionJob,
    target_status: str,
    *,
    now: datetime | None = None,
) -> None:
    allowed = _ALLOWED_TRANSITIONS.get(job.status, frozenset())
    if target_status not in allowed:
        raise InvalidTranscriptionJobTransition(
            f"Cannot move transcription job from {job.status!r} to {target_status!r}."
        )
    job.status = target_status
    job.updated_at = now or datetime.now(timezone.utc)
