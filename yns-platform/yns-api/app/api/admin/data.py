"""Hardcoded mock data for the Champion Dashboard API.

This is a temporary stand-in for the PostgreSQL database so the endpoints
return realistic data during development. Replace these module-level constants
with real queries once the DB layer is in place.
"""

from __future__ import annotations

from datetime import date, datetime

from app.api.admin.models import (
    Champion,
    DashboardSummary,
    DashboardTrends,
    InterviewSession,
    Meeting,
    MetricTrend,
    ProgressPoint,
    Student,
)

CHAMPION_ID = "champion-1"
CALENDLY_URL = "https://calendly.com/your-next-steps-us"

CHAMPION = Champion(
    id=CHAMPION_ID,
    first_name="Sydney",
    last_name="Champion",
    email="sydney.champion@yournextsteps-us.org",
    role="champion",
    avatar_url="https://i.pravatar.cc/150?img=47",
)

SUMMARY = DashboardSummary(
    assigned_students=32,
    interviews_completed=128,
    students_needing_help=7,
    overall_readiness_score=78,
    trends=DashboardTrends(
        assigned_students=MetricTrend(value="+4 from last month", direction="up"),
        interviews_completed=MetricTrend(
            value="+18 from last month", direction="up"
        ),
        students_needing_help=MetricTrend(
            value="+2 from last week", direction="down"
        ),
        overall_readiness_score=MetricTrend(
            value="+6% from last month", direction="up"
        ),
    ),
)

STUDENTS: list[Student] = [
    Student(
        id="stu-jasmine",
        first_name="Jasmine",
        last_name="Brown",
        email="jasmine.brown@email.com",
        phone="(312) 555-0198",
        school="University of Illinois Chicago",
        year="Junior, Class of 2026",
        field_pursuing="Marketing",
        gpa="3.6 / 4.0",
        resume_url="/resumes/jasmine-brown.pdf",
        resume_uploaded=True,
        resume_updated_at=date(2025, 4, 28),
        assigned_champion_id=CHAMPION_ID,
        status="amazing",
        avatar_url="https://i.pravatar.cc/150?img=45",
        interviews_taken=6,
        last_interview_date=date(2025, 5, 3),
        upcoming_interview_date=date(2025, 5, 15),
        upcoming_interviews_count=1,
        latest_score=87,
        latest_score_date=date(2025, 5, 3),
        interview_types=["Behavioral", "Situational", "Technical"],
        progress_status="On Track",
        progress_percent=87,
        created_at=date(2024, 9, 1),
    ),
    Student(
        id="stu-ethan",
        first_name="Ethan",
        last_name="Carter",
        email="ethan.carter@email.com",
        phone="(312) 555-0142",
        school="DePaul University",
        year="Sophomore, Class of 2027",
        field_pursuing="Computer Science",
        gpa="3.8 / 4.0",
        resume_uploaded=True,
        resume_updated_at=date(2025, 4, 15),
        assigned_champion_id=CHAMPION_ID,
        status="great",
        avatar_url="https://i.pravatar.cc/150?img=12",
        interviews_taken=8,
        last_interview_date=date(2025, 5, 1),
        upcoming_interview_date=date(2025, 5, 18),
        upcoming_interviews_count=2,
        latest_score=91,
        latest_score_date=date(2025, 5, 1),
        interview_types=["Technical", "Behavioral"],
        progress_status="On Track",
        progress_percent=91,
        created_at=date(2024, 9, 10),
    ),
    Student(
        id="stu-maya",
        first_name="Maya",
        last_name="Johnson",
        email="maya.johnson@email.com",
        phone="(773) 555-0110",
        school="Loyola University Chicago",
        year="Senior, Class of 2025",
        field_pursuing="Nursing",
        gpa="3.7 / 4.0",
        resume_uploaded=True,
        resume_updated_at=date(2025, 4, 22),
        assigned_champion_id=CHAMPION_ID,
        status="great",
        avatar_url="https://i.pravatar.cc/150?img=32",
        interviews_taken=5,
        last_interview_date=date(2025, 4, 29),
        upcoming_interview_date=date(2025, 5, 15),
        upcoming_interviews_count=1,
        latest_score=84,
        latest_score_date=date(2025, 4, 29),
        interview_types=["Behavioral", "Situational"],
        progress_status="On Track",
        progress_percent=84,
        created_at=date(2024, 8, 20),
    ),
    Student(
        id="stu-liam",
        first_name="Liam",
        last_name="Williams",
        email="liam.williams@email.com",
        phone="(312) 555-0177",
        school="University of Chicago",
        year="Junior, Class of 2026",
        field_pursuing="Economics",
        gpa="3.9 / 4.0",
        resume_uploaded=True,
        resume_updated_at=date(2025, 4, 30),
        assigned_champion_id=CHAMPION_ID,
        status="amazing",
        avatar_url="https://i.pravatar.cc/150?img=15",
        interviews_taken=7,
        last_interview_date=date(2025, 5, 2),
        upcoming_interview_date=date(2025, 5, 19),
        upcoming_interviews_count=1,
        latest_score=89,
        latest_score_date=date(2025, 5, 2),
        interview_types=["Behavioral", "Situational", "Technical"],
        progress_status="On Track",
        progress_percent=89,
        created_at=date(2024, 9, 5),
    ),
    Student(
        id="stu-ava",
        first_name="Ava",
        last_name="Martinez",
        email="ava.martinez@email.com",
        phone="(773) 555-0163",
        school="Northeastern Illinois University",
        year="Freshman, Class of 2028",
        field_pursuing="Biology",
        gpa="3.1 / 4.0",
        resume_uploaded=False,
        assigned_champion_id=CHAMPION_ID,
        status="help",
        avatar_url="https://i.pravatar.cc/150?img=20",
        interviews_taken=2,
        last_interview_date=date(2025, 4, 20),
        upcoming_interview_date=date(2025, 5, 21),
        upcoming_interviews_count=1,
        latest_score=58,
        latest_score_date=date(2025, 4, 20),
        interview_types=["Behavioral"],
        progress_status="Needs Attention",
        progress_percent=58,
        created_at=date(2025, 1, 15),
    ),
    Student(
        id="stu-noah",
        first_name="Noah",
        last_name="Davis",
        email="noah.davis@email.com",
        phone="(312) 555-0188",
        school="Illinois Institute of Technology",
        year="Sophomore, Class of 2027",
        field_pursuing="Mechanical Engineering",
        gpa="3.5 / 4.0",
        resume_uploaded=True,
        resume_updated_at=date(2025, 4, 18),
        assigned_champion_id=CHAMPION_ID,
        status="great",
        avatar_url="https://i.pravatar.cc/150?img=33",
        interviews_taken=4,
        last_interview_date=date(2025, 4, 27),
        upcoming_interview_date=date(2025, 5, 16),
        upcoming_interviews_count=1,
        latest_score=80,
        latest_score_date=date(2025, 4, 27),
        interview_types=["Technical", "Situational"],
        progress_status="On Track",
        progress_percent=80,
        created_at=date(2024, 10, 2),
    ),
    Student(
        id="stu-olivia",
        first_name="Olivia",
        last_name="Thompson",
        email="olivia.thompson@email.com",
        phone="(773) 555-0125",
        school="Columbia College Chicago",
        year="Senior, Class of 2025",
        field_pursuing="Film & Media",
        gpa="3.6 / 4.0",
        resume_uploaded=True,
        resume_updated_at=date(2025, 4, 25),
        assigned_champion_id=CHAMPION_ID,
        status="amazing",
        avatar_url="https://i.pravatar.cc/150?img=23",
        interviews_taken=9,
        last_interview_date=date(2025, 5, 4),
        upcoming_interview_date=date(2025, 5, 20),
        upcoming_interviews_count=2,
        latest_score=92,
        latest_score_date=date(2025, 5, 4),
        interview_types=["Behavioral", "Situational"],
        progress_status="On Track",
        progress_percent=92,
        created_at=date(2024, 8, 12),
    ),
    Student(
        id="stu-james",
        first_name="James",
        last_name="Wilson",
        email="james.wilson@email.com",
        phone="(312) 555-0151",
        school="Roosevelt University",
        year="Freshman, Class of 2028",
        field_pursuing="Business Administration",
        gpa="2.9 / 4.0",
        resume_uploaded=False,
        assigned_champion_id=CHAMPION_ID,
        status="help",
        avatar_url="https://i.pravatar.cc/150?img=51",
        interviews_taken=1,
        last_interview_date=date(2025, 4, 15),
        upcoming_interview_date=date(2025, 5, 22),
        upcoming_interviews_count=1,
        latest_score=54,
        latest_score_date=date(2025, 4, 15),
        interview_types=["Behavioral"],
        progress_status="At Risk",
        progress_percent=54,
        created_at=date(2025, 2, 1),
    ),
    Student(
        id="stu-sophia",
        first_name="Sophia",
        last_name="Lee",
        email="sophia.lee@email.com",
        phone="(773) 555-0139",
        school="Northwestern University",
        year="Junior, Class of 2026",
        field_pursuing="Psychology",
        gpa="3.7 / 4.0",
        resume_uploaded=True,
        resume_updated_at=date(2025, 4, 21),
        assigned_champion_id=CHAMPION_ID,
        status="great",
        avatar_url="https://i.pravatar.cc/150?img=44",
        interviews_taken=6,
        last_interview_date=date(2025, 4, 30),
        upcoming_interview_date=date(2025, 5, 17),
        upcoming_interviews_count=1,
        latest_score=83,
        latest_score_date=date(2025, 4, 30),
        interview_types=["Behavioral", "Situational"],
        progress_status="On Track",
        progress_percent=83,
        created_at=date(2024, 9, 18),
    ),
    Student(
        id="stu-benjamin",
        first_name="Benjamin",
        last_name="Anderson",
        email="benjamin.anderson@email.com",
        phone="(312) 555-0194",
        school="University of Illinois Chicago",
        year="Senior, Class of 2025",
        field_pursuing="Finance",
        gpa="3.8 / 4.0",
        resume_uploaded=True,
        resume_updated_at=date(2025, 4, 26),
        assigned_champion_id=CHAMPION_ID,
        status="amazing",
        avatar_url="https://i.pravatar.cc/150?img=68",
        interviews_taken=10,
        last_interview_date=date(2025, 5, 5),
        upcoming_interview_date=date(2025, 5, 23),
        upcoming_interviews_count=1,
        latest_score=90,
        latest_score_date=date(2025, 5, 5),
        interview_types=["Behavioral", "Technical"],
        progress_status="On Track",
        progress_percent=90,
        created_at=date(2024, 8, 5),
    ),
]

STUDENTS_BY_ID: dict[str, Student] = {s.id: s for s in STUDENTS}

PROGRESS_BY_STUDENT: dict[str, list[ProgressPoint]] = {
    "stu-jasmine": [
        ProgressPoint(date="Mar 15", score=55),
        ProgressPoint(date="Mar 22", score=62),
        ProgressPoint(date="Mar 29", score=68),
        ProgressPoint(date="Apr 5", score=72),
        ProgressPoint(date="Apr 12", score=78),
        ProgressPoint(date="Apr 19", score=81),
        ProgressPoint(date="Apr 26", score=85),
        ProgressPoint(date="May 3", score=87),
    ],
}

INTERVIEWS_BY_STUDENT: dict[str, list[InterviewSession]] = {
    "stu-jasmine": [
        InterviewSession(
            id="int-1",
            student_id="stu-jasmine",
            interview_type="Behavioral",
            score=87,
            status="Completed",
            feedback_summary=(
                "Strong STAR responses; great examples. Work on conciseness."
            ),
            completed_at=date(2025, 5, 3),
        ),
        InterviewSession(
            id="int-2",
            student_id="stu-jasmine",
            interview_type="Situational",
            score=85,
            status="Completed",
            feedback_summary=(
                "Excellent problem-solving approach. Keep practicing."
            ),
            completed_at=date(2025, 4, 26),
        ),
        InterviewSession(
            id="int-3",
            student_id="stu-jasmine",
            interview_type="Technical",
            score=81,
            status="Completed",
            feedback_summary=(
                "Solid technical knowledge. Review advanced concepts."
            ),
            completed_at=date(2025, 4, 19),
        ),
        InterviewSession(
            id="int-4",
            student_id="stu-jasmine",
            interview_type="Behavioral",
            score=78,
            status="Completed",
            feedback_summary="Good structure. Add more impact to examples.",
            completed_at=date(2025, 4, 12),
        ),
        InterviewSession(
            id="int-5",
            student_id="stu-jasmine",
            interview_type="Situational",
            score=72,
            status="Completed",
            feedback_summary=(
                "Consider alternative solutions in future scenarios."
            ),
            completed_at=date(2025, 4, 5),
        ),
    ],
}

MEETINGS: list[Meeting] = [
    Meeting(
        id="mtg-1",
        student_id="stu-maya",
        student_name="Maya Johnson",
        champion_id=CHAMPION_ID,
        title="Mock interview prep",
        start_time=datetime(2025, 5, 15, 13, 0),
        end_time=datetime(2025, 5, 15, 13, 30),
        meeting_type="Virtual",
        status="great",
    ),
    Meeting(
        id="mtg-2",
        student_id="stu-noah",
        student_name="Noah Davis",
        champion_id=CHAMPION_ID,
        title="Resume review",
        start_time=datetime(2025, 5, 16, 15, 0),
        end_time=datetime(2025, 5, 16, 15, 30),
        meeting_type="Virtual",
        status="great",
    ),
    Meeting(
        id="mtg-3",
        student_id="stu-jasmine",
        student_name="Jasmine Brown",
        champion_id=CHAMPION_ID,
        title="Internship interview coaching",
        start_time=datetime(2025, 5, 20, 10, 0),
        end_time=datetime(2025, 5, 20, 10, 30),
        meeting_type="Virtual",
        status="amazing",
    ),
]


def build_fallback_progress(latest_score: int) -> list[ProgressPoint]:
    """Generate a simple upward trend for students without curated data."""
    labels = [
        "Mar 15",
        "Mar 22",
        "Mar 29",
        "Apr 5",
        "Apr 12",
        "Apr 19",
        "Apr 26",
        "May 3",
    ]
    start = max(40, latest_score - 28)
    step = (latest_score - start) / (len(labels) - 1)
    return [
        ProgressPoint(date=label, score=round(start + step * i))
        for i, label in enumerate(labels)
    ]


def build_fallback_interviews(student: Student) -> list[InterviewSession]:
    """Generate interview history for students without curated data."""
    types = student.interview_types or ["Behavioral"]
    completed = student.last_interview_date or date(2025, 5, 1)
    return [
        InterviewSession(
            id=f"{student.id}-int-{i}",
            student_id=student.id,
            interview_type=types[i % len(types)],
            score=max(45, student.latest_score - i * 4),
            status="Completed",
            feedback_summary=(
                "Most recent session. Keep building on your strengths."
                if i == 0
                else "Completed practice session with actionable feedback."
            ),
            completed_at=completed,
        )
        for i in range(4)
    ]
