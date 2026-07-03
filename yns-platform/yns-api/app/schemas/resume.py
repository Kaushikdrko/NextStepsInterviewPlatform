from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ResumeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    file_name: str
    storage_path: str
    mime_type: str | None = None
    file_size: int | None = None
    extracted_text: str | None = None
    created_at: datetime
