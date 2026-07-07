from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

TargetLevel = Literal["internship", "part_time", "entry_level", "junior", "mid_level", "senior"]


class CareerProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    target_field: str | None = None
    interview_type: str | None = None
    skills: list[str] = Field(default_factory=list)
    major: str | None = None
    target_level: TargetLevel | None = None
    target_job_title: str | None = None
    grade_level: str | None = None
    intended_major: str | None = None
    colleges_preparing_for: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    @field_validator("skills", "colleges_preparing_for", mode="before")
    @classmethod
    def default_list(cls, value):
        return value or []
