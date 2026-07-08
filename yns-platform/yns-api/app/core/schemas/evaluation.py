from pydantic import BaseModel, Field


class EvaluationDimension(BaseModel):
    """One scored rubric item — always substance, never delivery.

    Never score filler words, accent, or speaking style here; that is the
    Quinncia/Big Interview approach YNS explicitly rejects (see claude.md).
    """

    model_config = {"extra": "forbid"}

    name: str
    score: int = Field(ge=1, le=5)
    rationale: str
    quote: str | None = None


class TurnEvaluation(BaseModel):
    model_config = {"extra": "forbid"}

    dimensions: list[EvaluationDimension]
    overall: int = Field(ge=1, le=5)
    notable_strengths: list[str] = Field(min_length=1, max_length=2)
    notable_gaps: list[str] = Field(min_length=1, max_length=2)
