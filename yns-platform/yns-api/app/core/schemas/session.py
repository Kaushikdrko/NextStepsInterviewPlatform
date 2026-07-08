from typing import Literal

from pydantic import BaseModel, Field

SessionType = Literal["behavioral", "technical", "mixed"]
QuestionCategory = Literal["behavioral", "technical", "values"]
QuestionDifficulty = Literal["warmup", "core", "stretch"]


class PlannedQuestion(BaseModel):
    model_config = {"extra": "forbid"}

    id: str
    category: QuestionCategory
    difficulty: QuestionDifficulty
    text: str
    intent: str
    rubric_focus: list[str] = Field(default_factory=list)


class SessionPlan(BaseModel):
    model_config = {"extra": "forbid"}

    session_type: SessionType
    questions: list[PlannedQuestion]
    target_minutes: int = 20
