from datetime import datetime
from typing import Literal

from pydantic import BaseModel

TranscriptionStatus = Literal[
    "pending",
    "processing",
    "completed",
    "failed",
    "cancelled",
]


class TranscriptionJobResponse(BaseModel):
    job_id: str
    status: TranscriptionStatus
    transcript: str | None = None
    error: str | None = None
    expires_at: datetime