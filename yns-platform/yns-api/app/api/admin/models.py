"""Pydantic models for the Champion (Admin) Dashboard API.

These mirror the TypeScript interfaces in `yns-web/types/champion.ts`. JSON is
serialized using camelCase aliases so the frontend can consume responses
without any field remapping.

When the PostgreSQL layer is added, these can back onto SQLAlchemy ORM models
(see the table sketch in `docs/schema.sql`). For now the router returns
hardcoded data shaped like these models.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

StudentStatus = Literal["great", "amazing", "help"]
InterviewType = Literal["Behavioral", "Situational", "Technical", "Mixed"]
InterviewStatus = Literal["Completed", "Scheduled", "In Progress"]
ProgressStatus = Literal["On Track", "Needs Attention", "At Risk"]
NoteVisibility = Literal["student", "private"]
MeetingType = Literal["Virtual", "In Person"]
TrendDirection = Literal["up", "down", "neutral"]


class CamelModel(BaseModel):
    """Base model that serializes/deserializes using camelCase keys."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class Champion(CamelModel):
    id: str
    first_name: str
    last_name: str
    email: str
    role: Literal["champion", "admin"] = "champion"
    avatar_url: Optional[str] = None


class Student(CamelModel):
    id: str
    first_name: str
    last_name: str
    email: str
    phone: str
    school: str
    year: str
    field_pursuing: str
    gpa: str
    resume_url: Optional[str] = None
    resume_uploaded: bool = False
    resume_updated_at: Optional[date] = None
    assigned_champion_id: str
    status: StudentStatus
    avatar_url: Optional[str] = None
    interviews_taken: int = 0
    last_interview_date: Optional[date] = None
    upcoming_interview_date: Optional[date] = None
    upcoming_interviews_count: int = 0
    latest_score: int = 0
    latest_score_date: Optional[date] = None
    interview_types: List[InterviewType] = []
    progress_status: ProgressStatus = "On Track"
    progress_percent: int = 0
    created_at: Optional[date] = None


class InterviewSession(CamelModel):
    id: str
    student_id: str
    interview_type: InterviewType
    question_mode: Optional[str] = None
    score: int
    status: InterviewStatus
    feedback_summary: str
    completed_at: date


class ProgressPoint(CamelModel):
    date: str
    score: int


class MentorNote(CamelModel):
    id: str
    student_id: str
    champion_id: str
    note: str
    visibility: NoteVisibility
    created_at: datetime


class Meeting(CamelModel):
    id: str
    student_id: str
    student_name: str
    champion_id: str
    title: str
    start_time: datetime
    end_time: datetime
    meeting_type: MeetingType = "Virtual"
    calendly_url: Optional[str] = None
    status: StudentStatus


class MetricTrend(CamelModel):
    value: str
    direction: TrendDirection


class DashboardTrends(CamelModel):
    assigned_students: MetricTrend
    interviews_completed: MetricTrend
    students_needing_help: MetricTrend
    overall_readiness_score: MetricTrend


class DashboardSummary(CamelModel):
    assigned_students: int
    interviews_completed: int
    students_needing_help: int
    overall_readiness_score: int
    trends: DashboardTrends


# --- Request bodies ------------------------------------------------------


class CreateNoteRequest(CamelModel):
    note: str
    visibility: NoteVisibility


class CreateAssignmentRequest(CamelModel):
    champion_id: str


class AssignmentResponse(CamelModel):
    student_id: str
    champion_id: str
    assigned: bool = True
