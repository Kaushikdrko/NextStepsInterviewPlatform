from typing import Literal

from pydantic import BaseModel, Field

OnboardingUserType = Literal["high_school", "college", "recent_grad"]


class CareerProfileDraft(BaseModel):
    major: str = ""
    target_field: str = ""
    target_level: str = ""
    skills: list[str] = Field(default_factory=list)
    has_job_posting: bool = False
    company: str = ""
    posting_url: str = ""
    job_description: str = ""


class HighSchoolProfileDraft(BaseModel):
    grade: str = ""
    target_colleges: list[str] = Field(default_factory=list)
    interested_major_or_field: str = ""
    interview_type: str = ""
    activities: str = ""
    has_specific_prompt: bool = False
    college_or_program_name: str = ""
    interview_description: str = ""


class OnboardingSubmitRequest(BaseModel):
    name: str
    user_type: OnboardingUserType
    career_profile: CareerProfileDraft | None = None
    high_school_profile: HighSchoolProfileDraft | None = None


class OnboardingSubmitResponse(BaseModel):
    success: bool
    error: str | None = None
