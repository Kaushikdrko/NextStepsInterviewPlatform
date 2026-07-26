from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class JobPostingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    company: str | None = None
    job_title: str | None = None
    job_description: str | None = None
    posting_url: str | None = None
    parsed_facts: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime
