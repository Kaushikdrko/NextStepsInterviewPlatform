from unittest.mock import patch

from app.core.assistants.evaluator import evaluate_turn
from app.core.schemas.evaluation import TurnEvaluation
from app.core.schemas.session import PlannedQuestion
from app.core.schemas.student import StudentProfile


def make_question(**overrides) -> PlannedQuestion:
    defaults = dict(
        id="q1",
        category="behavioral",
        difficulty="core",
        text="Tell me about a time you took ownership of a project.",
        intent="probe ownership",
        rubric_focus=["specificity", "ownership"],
    )
    defaults.update(overrides)
    return PlannedQuestion(**defaults)


def make_profile(**overrides) -> StudentProfile:
    defaults = dict(
        student_id="student-1",
        career_stage="college_student",
        target_role="Software Engineer",
        target_level="internship",
        interests=["Python", "React"],
        goals=["Land a software engineering internship"],
    )
    defaults.update(overrides)
    return StudentProfile(**defaults)


@patch("app.core.assistants.evaluator.call_gemini")
def test_evaluation_returns_turn_evaluation(mock_call_gemini):
    mock_call_gemini.return_value = {
        "dimensions": [
            {
                "name": "specificity",
                "score": 4,
                "rationale": "Named the exact tool and outcome.",
                "quote": "I rewrote the ingestion script in Python.",
            },
            {
                "name": "ownership",
                "score": 3,
                "rationale": "Used 'we' more than 'I'.",
                "quote": None,
            },
        ],
        "overall": 3,
        "notable_strengths": ["Named the specific tool used."],
        "notable_gaps": ["Clarify personal contribution vs. team's."],
    }

    evaluation = evaluate_turn(make_question(), "We rewrote the ingestion script.", make_profile())

    assert isinstance(evaluation, TurnEvaluation)


@patch("app.core.assistants.evaluator.call_gemini")
def test_evaluation_scores_in_range(mock_call_gemini):
    mock_call_gemini.return_value = {
        "dimensions": [
            {"name": "specificity", "score": 1, "rationale": "Too vague.", "quote": None},
            {"name": "ownership", "score": 5, "rationale": "Fully owned it.", "quote": "I did X."},
        ],
        "overall": 3,
        "notable_strengths": ["Owned the decision clearly."],
        "notable_gaps": ["Add more concrete detail."],
    }

    evaluation = evaluate_turn(make_question(), "some answer", make_profile())

    assert all(1 <= d.score <= 5 for d in evaluation.dimensions)
    assert 1 <= evaluation.overall <= 5


@patch("app.core.assistants.evaluator.call_gemini")
def test_evaluation_strengths_not_empty(mock_call_gemini):
    mock_call_gemini.return_value = {
        "dimensions": [
            {"name": "specificity", "score": 4, "rationale": "Good detail.", "quote": None},
        ],
        "overall": 4,
        "notable_strengths": ["Gave a concrete example."],
        "notable_gaps": ["Could quantify the impact."],
    }

    evaluation = evaluate_turn(make_question(), "some answer", make_profile())

    assert len(evaluation.notable_strengths) >= 1


@patch("app.core.assistants.evaluator.call_gemini")
def test_evaluation_gaps_not_empty(mock_call_gemini):
    mock_call_gemini.return_value = {
        "dimensions": [
            {"name": "specificity", "score": 4, "rationale": "Good detail.", "quote": None},
        ],
        "overall": 4,
        "notable_strengths": ["Gave a concrete example."],
        "notable_gaps": ["Could quantify the impact."],
    }

    evaluation = evaluate_turn(make_question(), "some answer", make_profile())

    assert len(evaluation.notable_gaps) >= 1
