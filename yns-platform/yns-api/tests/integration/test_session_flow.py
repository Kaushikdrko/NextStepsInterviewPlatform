import pytest

from app.core.assistants.evaluator import evaluate_turn
from app.core.assistants.planner import plan_session
from app.core.assistants.reporter import generate_report
from app.core.schemas.evaluation import TurnEvaluation
from app.core.schemas.report import SessionReport
from app.core.schemas.session import SessionPlan
from app.core.schemas.student import ResumeFacts, StudentProfile

pytestmark = pytest.mark.integration

SAMPLE_ANSWER = (
    "Situation: Last spring, our student org's course-scheduling spreadsheet "
    "kept breaking because too many people were editing it at once. Task: I "
    "took it on myself to fix it since I was the only one with any coding "
    "background. Action: I built a small web app in Python and React that "
    "let students submit their schedules through a form instead of editing "
    "the sheet directly, and I set up validation so conflicting time slots "
    "got flagged immediately. Result: about 200 students used it that "
    "semester, and the scheduling errors that used to take our advisor hours "
    "to untangle basically disappeared."
)


def make_profile() -> StudentProfile:
    return StudentProfile(
        student_id="student-1",
        career_stage="college_student",
        target_role="Software Engineer",
        target_level="internship",
        interests=["Python", "React", "education technology"],
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


def test_full_pipeline():
    profile = make_profile()

    plan = plan_session(profile, "behavioral", n_questions=5)
    assert isinstance(plan, SessionPlan)
    assert len(plan.questions) == 5

    question = plan.questions[0]

    evaluation = evaluate_turn(question, SAMPLE_ANSWER, profile)
    assert isinstance(evaluation, TurnEvaluation)

    report = generate_report(
        {},
        [
            {
                "question": question.model_dump(),
                "evaluation": evaluation.model_dump(),
                "answer_text": SAMPLE_ANSWER,
            }
        ],
        profile,
    )
    assert isinstance(report, SessionReport)
