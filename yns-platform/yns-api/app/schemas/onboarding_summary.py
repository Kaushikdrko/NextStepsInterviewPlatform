from typing import Literal

from pydantic import BaseModel, EmailStr

from app.schemas.user import UserType


class SummaryUser(BaseModel):
    id: str
    name: str | None = None
    email: EmailStr
    user_type: UserType


class CareerProfileSummary(BaseModel):
    major: str | None = None
    target_field: str | None = None
    target_level: str | None = None


class HighSchoolProfileSummary(BaseModel):
    grade: str | None = None
    colleges: list[str]
    intended_major: str | None = None
    interview_type: str | None = None


class ResumeSummary(BaseModel):
    file_name: str | None = None
    storage_path: str | None = None
    extracted_text: str | None = None


class JobPostingSummary(BaseModel):
    company: str | None = None
    job_title: str | None = None
    job_description: str | None = None
    posting_url: str | None = None


class AvailableContext(BaseModel):
    has_resume: bool
    has_job_posting: bool
    has_skills: bool


class AIContext(BaseModel):
    candidate_summary: str
    interview_focus: str
    available_context: AvailableContext


class OnboardingSummaryResponse(BaseModel):
    user: SummaryUser
    profile_type: Literal["career", "high_school"]
    career_profile: CareerProfileSummary | None = None
    high_school_profile: HighSchoolProfileSummary | None = None
    skills: list[str]
    resume: ResumeSummary | None = None
    job_posting: JobPostingSummary | None = None
    ai_context: AIContext
