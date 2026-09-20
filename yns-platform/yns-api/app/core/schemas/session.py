from typing import Literal

from pydantic import BaseModel, Field

from app.core.schemas.student import JobPostingFacts

SessionType = Literal["behavioral", "technical", "mixed", "resume", "job_posting"]
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
    job_posting_context: JobPostingFacts | None = None
    use_job_posting: bool = True
