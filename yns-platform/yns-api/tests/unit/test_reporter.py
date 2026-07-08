from unittest.mock import patch

from app.core.assistants.reporter import generate_report
from app.core.schemas.report import SessionReport
from app.core.schemas.student import StudentProfile


def make_turns() -> list[dict]:
    return [
        {
            "session_id": "session-1",
            "turn_index": 0,
            "question": {
                "id": "q1",
                "category": "behavioral",
                "difficulty": "warmup",
                "text": "Tell me about a project you're proud of.",
                "intent": "warm up",
                "rubric_focus": ["specificity"],
            },
            "answer_text": "I built a scheduling app used by 200 students.",
            "evaluation": {
                "dimensions": [
                    {"name": "specificity", "score": 4, "rationale": "Named a real metric.", "quote": None}
                ],
                "overall": 4,
                "notable_strengths": ["Named the exact number of students."],
                "notable_gaps": ["Could describe the technical challenge more."],
            },
        },
        {
            "session_id": "session-1",
            "turn_index": 1,
            "question": {
                "id": "q2",
                "category": "technical",
                "difficulty": "core",
                "text": "Walk me through how you built the ETL pipeline.",
                "intent": "technical depth",
                "rubric_focus": ["technical_depth"],
            },
            "answer_text": "We used Python and Airflow to schedule the jobs.",
            "evaluation": {
                "dimensions": [
                    {"name": "technical_depth", "score": 3, "rationale": "Named tools but not design choices.", "quote": None}
                ],
                "overall": 3,
                "notable_strengths": ["Named the specific tools used."],
                "notable_gaps": ["Didn't explain design tradeoffs."],
            },
        },
        {
            "session_id": "session-1",
            "turn_index": 2,
            "question": {
                "id": "q3",
                "category": "values",
                "difficulty": "stretch",
                "text": "What problem do you want to solve?",
                "intent": "values",
                "rubric_focus": ["alignment_to_passion"],
            },
            "answer_text": "I want to make education more accessible.",
            "evaluation": {
                "dimensions": [
                    {"name": "alignment_to_passion", "score": 4, "rationale": "Connected to a personal story.", "quote": None}
                ],
                "overall": 4,
                "notable_strengths": ["Tied the goal to a specific personal experience."],
                "notable_gaps": ["Could name a concrete next step toward this goal."],
            },
        },
    ]


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


REPORT_DICT = {
    "overall": 4,
    "category_breakdown": [
        {"category": "behavioral", "score": 4, "notes": "Strong specificity throughout."},
        {"category": "technical", "score": 3, "notes": "Named tools but light on design reasoning."},
        {"category": "values", "score": 4, "notes": "Clear, personal connection to the mission."},
    ],
    "strengths": [
        "Named the exact number of students impacted by the scheduling app.",
        "Tied the values answer to a specific personal experience.",
    ],
    "growth_areas": [
        "Didn't explain design tradeoffs in the ETL pipeline answer.",
        "Could describe the technical challenge in the first answer more.",
    ],
    "recommended_next_steps": [
        "Rewrite the ETL answer explaining why Airflow was chosen over alternatives.",
        "Practice naming a concrete next step toward the education-access goal.",
        "Record and review the warmup answer, adding one more technical detail.",
    ],
}


@patch("app.core.assistants.reporter.call_claude")
def test_report_returns_session_report(mock_call_claude):
    mock_call_claude.return_value = REPORT_DICT

    session = {"session_type": "mixed"}
    report = generate_report(session, make_turns(), make_profile())

    assert isinstance(report, SessionReport)


@patch("app.core.assistants.reporter.call_claude")
def test_report_has_all_sections(mock_call_claude):
    mock_call_claude.return_value = REPORT_DICT

    session = {"session_type": "mixed"}
    report = generate_report(session, make_turns(), make_profile())

    assert 1 <= report.overall <= 5
    assert len(report.category_breakdown) >= 1
    assert len(report.strengths) >= 1
    assert len(report.growth_areas) >= 1
    assert len(report.recommended_next_steps) >= 1


@patch("app.core.assistants.reporter.call_claude")
def test_report_overall_in_range(mock_call_claude):
    mock_call_claude.return_value = {**REPORT_DICT, "overall": 3}

    session = {"session_type": "mixed"}
    report = generate_report(session, make_turns(), make_profile())

    assert report.overall == 3
