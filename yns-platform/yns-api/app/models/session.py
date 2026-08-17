import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    __table_args__ = (
        CheckConstraint(
            "session_type = ANY (ARRAY['behavioral'::text, 'technical'::text, 'mixed'::text])",
            name="interview_sessions_session_type_check",
        ),
        CheckConstraint(
            "status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'abandoned'::text])",
            name="interview_sessions_status_check",
        ),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("app_users.id"), nullable=False, index=True
    )
    session_type: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    session_plan: Mapped[dict] = mapped_column(JSONB, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class InterviewTurn(Base):
    __tablename__ = "interview_turns"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("interview_sessions.id"), nullable=False, index=True
    )
    turn_index: Mapped[int] = mapped_column(Integer, nullable=False)
    question: Mapped[dict] = mapped_column(JSONB, nullable=False)
    answer_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    evaluation: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class SessionReport(Base):
    __tablename__ = "session_reports"
    __table_args__ = (
        CheckConstraint("overall >= 1 AND overall <= 5", name="session_reports_overall_check"),
    )

    session_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("interview_sessions.id"), primary_key=True
    )
    overall: Mapped[int] = mapped_column(Integer, nullable=False)
    category_breakdown: Mapped[list] = mapped_column(JSONB, nullable=False)
    strengths: Mapped[list] = mapped_column(JSONB, nullable=False)
    growth_areas: Mapped[list] = mapped_column(JSONB, nullable=False)
    recommended_next_steps: Mapped[list] = mapped_column(JSONB, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
