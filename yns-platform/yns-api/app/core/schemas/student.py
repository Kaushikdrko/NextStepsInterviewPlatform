from typing import Literal

from pydantic import BaseModel, Field

CareerStage = Literal["high_school", "college_student", "recent_graduate"]
TargetLevel = Literal["internship", "entry_level", "junior", "mid_level", "senior"]


class ResumeFacts(BaseModel):
    """Structured facts extracted from a resume PDF by /resume/parse.

    Populated once resume parsing is built; until then, planner/evaluator/
    reporter must treat this as absent (StudentProfile.resume_facts is None).
    """

    model_config = {"extra": "forbid"}

    raw_text: str
    experiences: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    education: list[str] = Field(default_factory=list)


class PassionProfile(BaseModel):
    """The YNS-specific "what problem do you want to solve" signal.

    Distinct from ResumeFacts (what the student has done) — this captures
    what the student cares about, used to keep every assistant anchored to
    Dr. Smith's methodology instead of drifting into generic interview prep.
    """

    model_config = {"extra": "forbid"}

    problem_to_solve: str | None = None
    what_makes_them_come_alive: str | None = None
    stated_goals: list[str] = Field(default_factory=list)


class StudentProfile(BaseModel):
    model_config = {"extra": "forbid"}

    student_id: str
    career_stage: CareerStage
    target_role: str | None = None
    target_level: TargetLevel | None = None
    interests: list[str] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    resume_facts: ResumeFacts | None = None
    passion_profile: PassionProfile | None = None
