from unittest.mock import patch

import pytest

from app.core.assistants.planner import plan_session
from app.core.schemas.session import SessionPlan
from app.core.schemas.student import JobPostingFacts, ResumeFacts, StudentProfile


def make_profile(**overrides) -> StudentProfile:
    defaults = dict(
        student_id="student-1",
        career_stage="college_student",
        target_role="Software Engineer",
        target_level="internship",
        interests=["Python", "React"],
        goals=["Land a software engineering internship"],
        resume_facts=ResumeFacts(
            raw_text="Jane Doe resume",
            experiences=[
                "Built a course-scheduling app used by 200 students",
                "Interned on a data platform team, built an ETL pipeline",
            ],
            skills=["Python", "React"],
            education=["B.S. Computer Science, UT Dallas"],
        ),
    )
    defaults.update(overrides)
    return StudentProfile(**defaults)


TWO_QUESTION_PLAN = {
    "session_type": "behavioral",
    "target_minutes": 20,
    "questions": [
        {
            "id": "q1",
            "category": "behavioral",
            "difficulty": "warmup",
            "text": "Tell me about a project you're proud of.",
            "intent": "warm up",
            "rubric_focus": ["specificity"],
        },
        {
            "id": "q2",
            "category": "values",
            "difficulty": "stretch",
            "text": "What problem do you want to solve?",
            "intent": "values",
            "rubric_focus": ["alignment_to_passion"],
        },
    ],
}


@patch("app.core.assistants.planner.call_gemini")
def test_plan_returns_session_plan(mock_call_gemini):
    mock_call_gemini.return_value = TWO_QUESTION_PLAN

    plan = plan_session(make_profile(), "behavioral")

    assert isinstance(plan, SessionPlan)
    assert len(plan.questions) == 2
    assert plan.session_type == "behavioral"


@patch("app.core.assistants.planner.call_gemini")
def test_plan_first_question_is_warmup(mock_call_gemini):
    mock_call_gemini.return_value = TWO_QUESTION_PLAN

    plan = plan_session(make_profile(), "behavioral")

    assert plan.questions[0].difficulty == "warmup"


@patch("app.core.assistants.planner.call_gemini")
def test_plan_has_values_question(mock_call_gemini):
    mock_call_gemini.return_value = TWO_QUESTION_PLAN

    plan = plan_session(make_profile(), "behavioral")

    assert any(q.category == "values" for q in plan.questions)


@patch("app.core.assistants.planner.call_gemini")
def test_plan_handles_missing_resume(mock_call_gemini):
    mock_call_gemini.return_value = TWO_QUESTION_PLAN

    profile = make_profile(resume_facts=None)
    plan = plan_session(profile, "behavioral")

    assert isinstance(plan, SessionPlan)


@patch("app.core.assistants.planner.call_gemini")
def test_plan_prompt_includes_major_and_target_level(mock_call_gemini):
    mock_call_gemini.return_value = TWO_QUESTION_PLAN

    profile = make_profile(target_level="senior", major="Computer Science")
    plan_session(profile, "behavioral")

    sent_prompt = mock_call_gemini.call_args.kwargs["contents"]
    assert "senior" in sent_prompt
    assert "Computer Science" in sent_prompt


@patch("app.core.assistants.planner.call_gemini")
def test_plan_prompt_includes_job_posting_summary(mock_call_gemini):
    mock_call_gemini.return_value = TWO_QUESTION_PLAN

    profile = make_profile(
        job_posting_facts=JobPostingFacts(
            required_skills=["Python", "Kubernetes"],
            responsibilities=["Own the deployment pipeline"],
            domain_focus="platform engineering",
        )
    )
    plan_session(profile, "behavioral")

    sent_prompt = mock_call_gemini.call_args.kwargs["contents"]
    assert "Kubernetes" in sent_prompt
    assert "platform engineering" in sent_prompt


@patch("app.core.assistants.planner.call_gemini")
def test_plan_with_job_posting_still_has_values_question(mock_call_gemini):
    mock_call_gemini.return_value = TWO_QUESTION_PLAN

    profile = make_profile(
        job_posting_facts=JobPostingFacts(
            required_skills=["Python", "Kubernetes"],
            responsibilities=["Own the deployment pipeline"],
            domain_focus="platform engineering",
        )
    )
    plan = plan_session(profile, "behavioral")

    assert any(q.category == "values" for q in plan.questions)


@patch("app.core.assistants.planner.call_gemini")
def test_plan_handles_missing_job_posting(mock_call_gemini):
    mock_call_gemini.return_value = TWO_QUESTION_PLAN

    profile = make_profile(job_posting_facts=None)
    plan = plan_session(profile, "behavioral")

    assert isinstance(plan, SessionPlan)


@patch("app.core.assistants.planner.call_gemini")
def test_plan_no_dangling_job_posting_language_when_absent(mock_call_gemini):
    mock_call_gemini.return_value = TWO_QUESTION_PLAN

    plan_session(make_profile(job_posting_facts=None), "behavioral")

    sent_prompt = mock_call_gemini.call_args.kwargs["contents"]
    assert "No job posting on file" in sent_prompt


@pytest.mark.parametrize(
    "target_level,major",
    [
        ("internship", "Computer Science"),
        ("entry_level", None),
        ("junior", "Business Administration"),
        ("mid_level", "Mechanical Engineering"),
        ("senior", None),
    ],
)
@patch("app.core.assistants.planner.call_gemini")
def test_plan_valid_across_level_and_major_combinations(mock_call_gemini, target_level, major):
    mock_call_gemini.return_value = TWO_QUESTION_PLAN

    profile = make_profile(target_level=target_level, major=major)
    plan = plan_session(profile, "behavioral")

    assert isinstance(plan, SessionPlan)
    assert any(q.category == "values" for q in plan.questions)
