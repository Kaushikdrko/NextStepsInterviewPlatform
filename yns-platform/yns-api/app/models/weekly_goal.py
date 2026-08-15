from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class WeeklyGoal(Base):
    __tablename__ = "weekly_goals"

    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("app_users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    target_sessions: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
