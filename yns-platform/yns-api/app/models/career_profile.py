import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CareerProfile(Base):
    __tablename__ = "career_profiles"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("app_users.id"), nullable=False, index=True
    )
    target_field: Mapped[str | None] = mapped_column(String, nullable=True)
    interview_type: Mapped[str | None] = mapped_column(String, nullable=True)
    skills: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    major: Mapped[str | None] = mapped_column(String, nullable=True)
    target_level: Mapped[str | None] = mapped_column(String, nullable=True)
    target_job_title: Mapped[str | None] = mapped_column(String, nullable=True)
    grade_level: Mapped[str | None] = mapped_column(String, nullable=True)
    intended_major: Mapped[str | None] = mapped_column(String, nullable=True)
    colleges_preparing_for: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
