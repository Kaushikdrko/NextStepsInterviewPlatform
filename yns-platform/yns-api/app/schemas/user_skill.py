from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserSkillRowResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    skills: list[str] = Field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @field_validator("skills", mode="before")
    @classmethod
    def default_skills(cls, value):
        return value or []


class UserSkillsResponse(BaseModel):
    user_id: str
    skills: list[str]
