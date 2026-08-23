import io
import wave
from dataclasses import dataclass

from app.services.transcription_jobs import (
    MAX_AUDIO_DURATION_MS,
    MAX_AUDIO_SIZE_BYTES,
)

MIN_AUDIO_DURATION_MS = 500
EXPECTED_CHANNELS = 1
EXPECTED_SAMPLE_WIDTH_BYTES = 2
EXPECTED_SAMPLE_RATE_HZ = 16_000


@dataclass(frozen=True)
class ValidatedWav:
    size_bytes: int
    duration_ms: int


def validate_wav(audio_bytes: bytes) -> ValidatedWav:
    size_bytes = len(audio_bytes)

    if not 0 < size_bytes <= MAX_AUDIO_SIZE_BYTES:
        raise ValueError("Recording must be smaller than 25 MiB.")

    try:
        with wave.open(io.BytesIO(audio_bytes), "rb") as recording:
            channels = recording.getnchannels()
            sample_width = recording.getsampwidth()
            sample_rate = recording.getframerate()
            frame_count = recording.getnframes()
            compression = recording.getcomptype()

            if channels != EXPECTED_CHANNELS:
                raise ValueError("Recording must use mono audio.")
            if sample_width != EXPECTED_SAMPLE_WIDTH_BYTES:
                raise ValueError("Recording must use 16-bit audio.")
            if sample_rate != EXPECTED_SAMPLE_RATE_HZ:
                raise ValueError("Recording must use a 16 kHz sample rate.")
            if compression != "NONE":
                raise ValueError("Recording must use uncompressed PCM audio.")
            if frame_count <= 0:
                raise ValueError("Recording does not contain audio.")

            pcm_bytes = recording.readframes(frame_count)
            expected_size = frame_count * channels * sample_width
            if len(pcm_bytes) != expected_size:
                raise ValueError("Recording data is incomplete.")

    except (wave.Error, EOFError) as exc:
        raise ValueError("Recording is not a valid WAV file.") from exc

    duration_ms = round((frame_count / sample_rate) * 1000)

    if duration_ms < MIN_AUDIO_DURATION_MS:
        raise ValueError("Recording must be at least half a second.")
    if duration_ms > MAX_AUDIO_DURATION_MS:
        raise ValueError("Recording cannot exceed 5 minutes.")

    return ValidatedWav(
        size_bytes=size_bytes,
        duration_ms=duration_ms,
    )