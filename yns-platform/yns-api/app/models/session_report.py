from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SessionReport(Base):
    __tablename__ = "session_reports"

    session_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("interview_sessions.id", ondelete="CASCADE"),
        primary_key=True,
    )
    overall: Mapped[int] = mapped_column(Integer, nullable=False)
    category_breakdown: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    strengths: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    growth_areas: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    recommended_next_steps: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
