"""Pydantic schemas for the Champion Dashboard API.

Field names are serialized in camelCase (via ``to_camel``) so responses map
directly onto the frontend TypeScript models in
``yns-web/lib/champion/types.ts``. Requests accept either camelCase or snake_case
thanks to ``populate_by_name``.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

StudentStatus = Literal["on_track", "excellent", "watch", "needs_help", "not_started"]
GoalType = Literal["internship", "job", "college", "scholarship"]
EducationLevel = Literal["high_school", "college", "recent_grad"]
QuestionMode = Literal["behavioral", "technical", "situational", "mixed"]
ReviewStatus = Literal["pending", "reviewed", "needs_follow_up"]
SkillStatus = Literal["strong", "good", "needs_practice", "needs_help"]
NoteVisibility = Literal["student_visible", "private"]
NoteCategory = Literal[
    "general", "interview_feedback", "encouragement", "practice_assignment", "follow_up"
]
AssignmentStatus = Literal["assigned", "in_progress", "completed", "overdue", "cancelled"]
MeetingStatus = Literal["scheduled", "completed", "cancelled", "no_show"]
MeetingType = Literal[
    "interview_prep", "scholarship_guidance", "career_question", "general", "mock_interview"
]
InterviewState = Literal["completed", "in_progress", "abandoned"]


class ChampionBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class DashboardSummary(ChampionBase):
    assigned_students_count: int
    interviews_completed_count: int
    students_needing_help_count: int
    overall_readiness_score: int | None = None
    pending_reviews_count: int
    upcoming_meetings_count: int
    assignments_due_count: int


class StudentSummary(ChampionBase):
    id: str
    first_name: str
    last_name: str
    email: str
    school: str | None = None
    education_level: EducationLevel
    year: str | None = None
    field_pursuing: str | None = None
    goal_type: GoalType
    latest_score: int | None = None
    readiness_score: int | None = None
    last_practice_date: str | None = None
    completed_interviews: int
    status: StudentStatus


class ScoreTrendPoint(ChampionBase):
    date: str
    score: int


class SkillScore(ChampionBase):
    skill: str
    score: int
    status: SkillStatus
    recommendation: str


class StudentDetail(StudentSummary):
    phone: str | None = None
    gpa: float | None = None
    resume_uploaded: bool
    resume_url: str | None = None
    resume_last_updated: str | None = None
    assigned_champion_name: str
    average_score: int | None = None
    total_practice_minutes: int
    last_interview_date: str | None = None
    upcoming_meeting_date: str | None = None
    score_trend: list[ScoreTrendPoint]
    skills: list[SkillScore]


class StudentProgress(ChampionBase):
    score_trend: list[ScoreTrendPoint]
    skills: list[SkillScore]


class AttentionAlert(ChampionBase):
    id: str
    student_id: str
    student_name: str
    reason: str
    status: StudentStatus


class ActivityItem(ChampionBase):
    id: str
    student_id: str
    student_name: str
    interview_purpose: GoalType
    question_mode: QuestionMode
    score: int | None = None
    date: str
    review_status: ReviewStatus


class InterviewReview(ChampionBase):
    id: str
    student_id: str
    student_name: str
    interview_purpose: GoalType
    question_mode: QuestionMode
    date: str
    score: int | None = None
    status: InterviewState
    review_status: ReviewStatus


class ScoreBreakdownItem(ChampionBase):
    label: str
    score: int


class InterviewReviewDetail(InterviewReview):
    questions: list[str]
    transcript_summary: str
    feedback_summary: str
    score_breakdown: list[ScoreBreakdownItem]
    strengths: list[str]
    improvement_areas: list[str]
    recommended_next_practice: str
    champion_review_notes: str | None = None


class UpdateReviewRequest(ChampionBase):
    review_status: ReviewStatus
    champion_review_notes: str | None = None


class ChampionNote(ChampionBase):
    id: str
    student_id: str
    student_name: str
    champion_name: str
    content: str
    visibility: NoteVisibility
    category: NoteCategory
    created_at: str
    updated_at: str | None = None


class CreateNoteRequest(ChampionBase):
    content: str
    visibility: NoteVisibility
    category: NoteCategory = "general"


class UpdateNoteRequest(ChampionBase):
    content: str | None = None
    visibility: NoteVisibility | None = None
    category: NoteCategory | None = None


class PracticeAssignment(ChampionBase):
    id: str
    student_id: str
    student_name: str
    interview_purpose: GoalType
    question_mode: QuestionMode
    focus_skill: str
    resume_based: bool
    due_date: str | None = None
    instructions: str
    status: AssignmentStatus
    created_at: str


class CreateAssignmentRequest(ChampionBase):
    interview_purpose: GoalType
    question_mode: QuestionMode
    focus_skill: str
    resume_based: bool = False
    due_date: str | None = None
    instructions: str = ""


class UpdateAssignmentRequest(ChampionBase):
    status: AssignmentStatus | None = None
    due_date: str | None = None
    instructions: str | None = None


class Meeting(ChampionBase):
    id: str
    student_id: str
    student_name: str
    title: str
    meeting_type: MeetingType
    start_time: datetime
    end_time: datetime
    status: MeetingStatus
    meeting_url: str | None = None


class ChampionSettings(ChampionBase):
    first_name: str
    last_name: str
    display_name: str
    email: str
    phone: str | None = None
    title: str
    organization: str | None = None
    expertise_areas: list[str] = []
    bio: str = ""
    timezone: str
    profile_image_url: str | None = None
    calendly_url: str | None = None
    availability_note: str | None = None
    notify_completed_interviews: bool = True
    notify_student_notes: bool = True
    notify_scheduled_meetings: bool = True
    alert_students_needing_help: bool = True
