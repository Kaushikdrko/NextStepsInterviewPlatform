from pydantic import BaseModel

from app.core.schemas.evaluation import TurnEvaluation
from app.core.schemas.session import PlannedQuestion, SessionPlan


class CreateSessionRequest(BaseModel):
    session_type: str


class CreateSessionResponse(BaseModel):
    session_id: str
    session_plan: SessionPlan


class SubmitTurnRequest(BaseModel):
    turn_index: int
    answer_text: str


class TurnResponse(BaseModel):
    response_text: str
    action: str
    next_question: PlannedQuestion | None
    evaluation: TurnEvaluation
    session_complete: bool
