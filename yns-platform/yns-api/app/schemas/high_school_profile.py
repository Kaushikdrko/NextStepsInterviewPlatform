from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

InterviewType = Literal["admissions", "alumni", "scholarship", "honors", "program", "general"]


class HighSchoolProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    grade: str | None = None
    colleges: list[str] = Field(default_factory=list)
    intended_major: str | None = None
    interview_type: InterviewType | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @field_validator("colleges", mode="before")
    @classmethod
    def default_colleges(cls, value):
        return value or []
