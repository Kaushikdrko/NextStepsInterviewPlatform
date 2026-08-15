from datetime import datetime

from pydantic import BaseModel, Field

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


class SessionSummary(BaseModel):
    session_id: str
    session_type: str
    status: str
    created_at: datetime
    completed_at: datetime | None
    question_count: int
    answered_count: int
    average_rating: float | None
    duration_minutes: int | None = None


class SessionListResponse(BaseModel):
    sessions: list[SessionSummary]


class DashboardStatsResponse(BaseModel):
    interviews_completed: int
    questions_answered: int
    average_feedback_score: int | None = None
    practice_streak_days: int


class WeeklyProgressItem(BaseModel):
    day: str
    questions: int


class WeeklyProgressResponse(BaseModel):
    items: list[WeeklyProgressItem]


class WeeklyGoalUpdateRequest(BaseModel):
    target_sessions: int = Field(ge=1, le=50)


class WeeklyGoalResponse(BaseModel):
    target_sessions: int
    completed_sessions: int
    percent_complete: int
    week_start: datetime
    week_end: datetime


class FocusAreaResponse(BaseModel):
    focus_area: str | None
    detail: str
    supporting_category: str | None
    average_recent_score: float | None
    report_count: int


class SessionTurnDetail(BaseModel):
    turn_index: int
    question: PlannedQuestion
    answer_text: str
    evaluation: TurnEvaluation | None


class SessionDetailResponse(BaseModel):
    session_id: str
    session_type: str
    started_at: datetime
    status: str
    created_at: datetime
    completed_at: datetime | None
    turns: list[SessionTurnDetail]
