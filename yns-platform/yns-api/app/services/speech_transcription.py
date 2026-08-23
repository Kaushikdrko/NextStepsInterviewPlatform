from dataclasses import dataclass
from functools import lru_cache
from pathlib import PurePosixPath

from google.api_core.exceptions import NotFound
from google.cloud import speech_v1, storage

from app.config import settings

AUDIO_CONTENT_TYPE = "audio/wav"
SAMPLE_RATE_HZ = 16_000


class SpeechTranscriptionError(RuntimeError):
    pass


@dataclass(frozen=True)
class TranscriptionResult:
    done: bool
    transcript: str | None = None


def _validate_storage_path(storage_path: str) -> None:
    parts = PurePosixPath(storage_path).parts
    if not storage_path.startswith("transcriptions/") or ".." in parts:
        raise ValueError("Invalid transcription storage path.")


def _require_bucket_name() -> str:
    if not settings.voice_bucket:
        raise RuntimeError("VOICE_BUCKET is not configured.")
    return settings.voice_bucket


@lru_cache
def get_storage_client() -> storage.Client:
    return storage.Client(project=settings.gcp_project_id)


@lru_cache
def get_speech_client() -> speech_v1.SpeechClient:
    return speech_v1.SpeechClient()


def upload_audio(storage_path: str, audio_bytes: bytes) -> str:
    _validate_storage_path(storage_path)
    if not audio_bytes:
        raise ValueError("Audio file is empty.")

    bucket = get_storage_client().bucket(_require_bucket_name())
    blob = bucket.blob(storage_path)
    blob.upload_from_string(
        audio_bytes,
        content_type=AUDIO_CONTENT_TYPE,
        if_generation_match=0,
        timeout=60,
    )

    return f"gs://{bucket.name}/{storage_path}"


def start_transcription(gcs_uri: str) -> str:
    config = speech_v1.RecognitionConfig(
        encoding=speech_v1.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=SAMPLE_RATE_HZ,
        language_code="en-US",
        model="latest_long",
        enable_automatic_punctuation=True,
    )
    audio = speech_v1.RecognitionAudio(uri=gcs_uri)

    operation = get_speech_client().long_running_recognize(
        request={"config": config, "audio": audio},
        timeout=30,
    )
    return operation.operation.name


def poll_transcription(operation_name: str) -> TranscriptionResult:
    operations = get_speech_client().transport.operations_client
    operation = operations.get_operation(operation_name)

    if not operation.done:
        return TranscriptionResult(done=False)

    if operation.error.code:
        raise SpeechTranscriptionError(
            f"Speech operation failed with code {operation.error.code}."
        )

    response = speech_v1.LongRunningRecognizeResponse.deserialize(
        operation.response.value
    )
    transcript = " ".join(
        result.alternatives[0].transcript.strip()
        for result in response.results
        if result.alternatives and result.alternatives[0].transcript.strip()
    )

    if not transcript:
        raise SpeechTranscriptionError("No speech was detected.")

    return TranscriptionResult(done=True, transcript=transcript)


def cancel_transcription(operation_name: str) -> None:
    get_speech_client().transport.operations_client.cancel_operation(
        operation_name
    )


def delete_audio(storage_path: str) -> None:
    _validate_storage_path(storage_path)
    blob = get_storage_client().bucket(_require_bucket_name()).blob(storage_path)

    try:
        blob.delete(timeout=30)
    except NotFound:
        pass