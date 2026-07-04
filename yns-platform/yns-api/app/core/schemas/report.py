from pydantic import BaseModel, Field

from app.core.schemas.session import QuestionCategory


class CategoryScore(BaseModel):
    model_config = {"extra": "forbid"}

    category: QuestionCategory
    score: int = Field(ge=1, le=5)
    notes: str


class SessionReport(BaseModel):
    model_config = {"extra": "forbid"}

    overall: int = Field(ge=1, le=5)
    category_breakdown: list[CategoryScore]
    strengths: list[str] = Field(min_length=2, max_length=3)
    growth_areas: list[str] = Field(min_length=2, max_length=3)
    recommended_next_steps: list[str] = Field(min_length=3, max_length=3)
