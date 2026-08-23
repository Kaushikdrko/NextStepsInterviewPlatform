import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.api.speech.audio import validate_wav
from app.api.speech.models import TranscriptionJobResponse
from app.database import get_db
from app.dependencies import get_current_student
from app.models import InterviewSession, SpeechTranscriptionJob
from app.services.speech_transcription import (
    SpeechTranscriptionError,
    cancel_transcription,
    delete_audio,
    poll_transcription,
    start_transcription,
    upload_audio,
)
from app.services.transcription_jobs import (
    CANCELLED,
    COMPLETED,
    FAILED,
    MAX_AUDIO_SIZE_BYTES,
    PENDING,
    PROCESSING,
    create_transcription_job,
    get_owned_transcription_job,
    mark_transcription_cancelled,
    mark_transcription_completed,
    mark_transcription_failed,
    mark_transcription_processing,
    purge_expired_transcription_jobs,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/sessions/{session_id}/transcriptions",
    tags=["speech"],
)

ALLOWED_AUDIO_TYPES = frozenset({"audio/wav", "audio/x-wav"})


def _response(job: SpeechTranscriptionJob) -> TranscriptionJobResponse:
    return TranscriptionJobResponse(
        job_id=job.id,
        status=job.status,
        transcript=job.transcript,
        error=job.error_message,
        expires_at=job.expires_at,
    )


def _delete_audio_safely(storage_path: str) -> None:
    try:
        delete_audio(storage_path)
    except Exception:
        logger.exception("Failed to delete temporary transcription audio.")


def _cancel_operation_safely(operation_name: str) -> None:
    try:
        cancel_transcription(operation_name)
    except Exception:
        logger.exception("Failed to cancel Google transcription operation.")


def _cleanup_expired_jobs(db: Session) -> None:
    artifacts = purge_expired_transcription_jobs(db)
    if not artifacts:
        return

    db.commit()
    for artifact in artifacts:
        if artifact.operation_name:
            _cancel_operation_safely(artifact.operation_name)
        _delete_audio_safely(artifact.storage_path)


@router.post(
    "",
    response_model=TranscriptionJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def create_transcription(
    session_id: UUID,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_student),
    db: Session = Depends(get_db),
) -> TranscriptionJobResponse:
    _cleanup_expired_jobs(db)
    session_id_value = str(session_id)

    session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.id == session_id_value,
            InterviewSession.user_id == user_id,
            InterviewSession.status == "in_progress",
        )
        .with_for_update()
        .first()
    )
    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Interview session not found.",
        )

    if file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Recording must be a WAV file.",
        )

    audio_bytes = file.file.read(MAX_AUDIO_SIZE_BYTES + 1)

    try:
        metadata = validate_wav(audio_bytes)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    active_job = (
        db.query(SpeechTranscriptionJob)
        .filter(
            SpeechTranscriptionJob.user_id == user_id,
            SpeechTranscriptionJob.session_id == session_id_value,
            SpeechTranscriptionJob.status.in_([PENDING, PROCESSING]),
            SpeechTranscriptionJob.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    if active_job is not None:
        raise HTTPException(
            status_code=409,
            detail="A transcription is already processing for this interview.",
        )

    job = create_transcription_job(
        db,
        user_id=user_id,
        session_id=session_id_value,
        audio_size_bytes=metadata.size_bytes,
        audio_duration_ms=metadata.duration_ms,
    )
    db.commit()
    db.refresh(job)

    job_id = job.id
    storage_path = job.storage_path

    try:
        gcs_uri = upload_audio(storage_path, audio_bytes)
        operation_name = start_transcription(gcs_uri)

        mark_transcription_processing(
            db,
            job,
            operation_name=operation_name,
        )
        db.commit()
        db.refresh(job)

        return _response(job)

    except Exception:
        logger.exception(
            "Failed to start transcription job %s.",
            job_id,
        )
        db.rollback()

        try:
            failed_job = db.get(SpeechTranscriptionJob, job_id)

            if (
                failed_job is not None
                and failed_job.status in {PENDING, PROCESSING}
            ):
                mark_transcription_failed(
                    db,
                    failed_job,
                    safe_error_message=(
                        "Unable to transcribe this recording. "
                        "Please try again."
                    ),
                )
                db.commit()
        except Exception:
            db.rollback()
            logger.exception(
                "Failed to record transcription failure for job %s.",
                job_id,
            )

        _delete_audio_safely(storage_path)

        raise HTTPException(
            status_code=502,
            detail="Unable to start transcription. Please try again.",
        )


@router.get(
    "/{job_id}",
    response_model=TranscriptionJobResponse,
)
def get_transcription(
    session_id: UUID,
    job_id: UUID,
    user_id: str = Depends(get_current_student),
    db: Session = Depends(get_db),
) -> TranscriptionJobResponse:
    _cleanup_expired_jobs(db)
    job = get_owned_transcription_job(
        db,
        job_id=str(job_id),
        user_id=user_id,
        session_id=str(session_id),
    )
    if job is None:
        raise HTTPException(
            status_code=404,
            detail="Transcription job not found.",
        )

    if job.status != PROCESSING:
        return _response(job)

    if not job.operation_name:
        mark_transcription_failed(
            db,
            job,
            safe_error_message=(
                "Transcription failed. Please record your answer again."
            ),
        )
        db.commit()
        db.refresh(job)
        _delete_audio_safely(job.storage_path)
        return _response(job)

    try:
        result = poll_transcription(job.operation_name)

    except SpeechTranscriptionError:
        mark_transcription_failed(
            db,
            job,
            safe_error_message=(
                "Transcription failed. Please record your answer again."
            ),
        )
        db.commit()
        db.refresh(job)
        _delete_audio_safely(job.storage_path)
        return _response(job)

    except Exception as exc:
        logger.exception(
            "Unable to poll transcription job %s.",
            job.id,
        )
        raise HTTPException(
            status_code=503,
            detail="Transcription status is temporarily unavailable.",
        ) from exc

    if not result.done:
        return _response(job)

    mark_transcription_completed(
        db,
        job,
        transcript=result.transcript or "",
    )
    db.commit()
    db.refresh(job)
    _delete_audio_safely(job.storage_path)

    return _response(job)


@router.delete(
    "/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def cancel_transcription_job(
    session_id: UUID,
    job_id: UUID,
    user_id: str = Depends(get_current_student),
    db: Session = Depends(get_db),
) -> Response:
    _cleanup_expired_jobs(db)
    job = get_owned_transcription_job(
        db,
        job_id=str(job_id),
        user_id=user_id,
        session_id=str(session_id),
    )
    if job is None:
        raise HTTPException(status_code=404, detail="Transcription job not found.")

    if job.status == COMPLETED:
        raise HTTPException(
            status_code=409,
            detail="A completed transcription cannot be cancelled.",
        )

    if job.status in {FAILED, CANCELLED}:
        _delete_audio_safely(job.storage_path)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    if job.operation_name:
        _cancel_operation_safely(job.operation_name)

    mark_transcription_cancelled(db, job)
    db.commit()
    _delete_audio_safely(job.storage_path)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
