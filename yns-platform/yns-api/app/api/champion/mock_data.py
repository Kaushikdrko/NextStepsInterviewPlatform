"""TEMPORARY in-memory fixtures for the Champion Dashboard API.

There are no Champion/notes/assignments/meetings tables in the database yet, so
these fixtures let the endpoints return realistic, correctly-typed data while the
frontend is built. Replace the reads in ``service.py`` with real DB/Supabase
queries when the schema lands — the response models stay the same.

Kept in one clearly named module (not inline in the router) per project practice.
"""

from datetime import datetime

from app.api.champion.models import (
    ChampionNote,
    ChampionSettings,
    InterviewReviewDetail,
    Meeting,
    PracticeAssignment,
    StudentDetail,
)

# Placeholder identity for the "current" champion until auth wires a real user.
MOCK_CHAMPION_ID = "champion-001"
MOCK_CHAMPION_NAME = "Maya Robinson"

CHAMPION_SETTINGS = ChampionSettings(
    first_name="Maya",
    last_name="Robinson",
    display_name="Maya Robinson",
    email="maya.robinson@yournextsteps-us.org",
    phone="(312) 555-0142",
    title="Champion",
    organization="Your Next Steps-US",
    expertise_areas=["College Prep", "Scholarships", "Business"],
    bio=(
        "Career readiness mentor helping first-generation students prepare for "
        "college, scholarships, and their first internships."
    ),
    timezone="America/Chicago",
    profile_image_url=None,
    calendly_url="https://calendly.com/maya-robinson-yns",
    availability_note=(
        "Students can book time with me for interview prep, scholarship guidance, "
        "and career questions."
    ),
)

STUDENTS: list[StudentDetail] = [
    StudentDetail(
        id="stu-001",
        first_name="Jordan",
        last_name="Alvarez",
        email="jordan.alvarez@example.edu",
        phone="(773) 555-0111",
        school="Lincoln Park High School",
        education_level="high_school",
        year="Senior",
        field_pursuing="Computer Science",
        goal_type="college",
        gpa=3.8,
        resume_uploaded=True,
        resume_url="#",
        resume_last_updated="2026-06-28",
        assigned_champion_name=MOCK_CHAMPION_NAME,
        latest_score=88,
        readiness_score=84,
        average_score=82,
        completed_interviews=6,
        total_practice_minutes=214,
        last_practice_date="2026-07-09",
        last_interview_date="2026-07-09",
        upcoming_meeting_date="2026-07-15",
        status="excellent",
        score_trend=[
            {"date": "2026-05-20", "score": 68},
            {"date": "2026-06-02", "score": 74},
            {"date": "2026-06-18", "score": 79},
            {"date": "2026-06-30", "score": 83},
            {"date": "2026-07-09", "score": 88},
        ],
        skills=[
            {"skill": "Communication", "score": 88, "status": "strong", "recommendation": "Keep leading with clear, concise summaries."},
            {"skill": "Confidence", "score": 82, "status": "good", "recommendation": "Practice steady pacing to reduce filler words."},
            {"skill": "Response Structure", "score": 85, "status": "strong", "recommendation": "STAR structure is landing well — keep it up."},
            {"skill": "Technical Knowledge", "score": 79, "status": "good", "recommendation": "Review core CS fundamentals before college interviews."},
        ],
    ),
    StudentDetail(
        id="stu-002",
        first_name="Priya",
        last_name="Nair",
        email="priya.nair@example.edu",
        phone=None,
        school="University of Illinois Chicago",
        education_level="college",
        year="Sophomore",
        field_pursuing="Business Administration",
        goal_type="internship",
        gpa=3.5,
        resume_uploaded=True,
        resume_url="#",
        resume_last_updated="2026-07-01",
        assigned_champion_name=MOCK_CHAMPION_NAME,
        latest_score=76,
        readiness_score=72,
        average_score=71,
        completed_interviews=4,
        total_practice_minutes=138,
        last_practice_date="2026-07-07",
        last_interview_date="2026-07-07",
        upcoming_meeting_date=None,
        status="on_track",
        score_trend=[
            {"date": "2026-05-28", "score": 60},
            {"date": "2026-06-10", "score": 65},
            {"date": "2026-06-24", "score": 70},
            {"date": "2026-07-07", "score": 76},
        ],
        skills=[
            {"skill": "Communication", "score": 74, "status": "good", "recommendation": "Add specific examples to support your points."},
            {"skill": "Confidence", "score": 68, "status": "needs_practice", "recommendation": "Rehearse openings to start strong."},
            {"skill": "Time Management", "score": 66, "status": "needs_practice", "recommendation": "Keep answers under two minutes."},
        ],
    ),
    StudentDetail(
        id="stu-003",
        first_name="Marcus",
        last_name="Bell",
        email="marcus.bell@example.edu",
        phone="(312) 555-0199",
        school="Malcolm X College",
        education_level="college",
        year="Freshman",
        field_pursuing="Nursing",
        goal_type="scholarship",
        gpa=3.1,
        resume_uploaded=False,
        resume_url=None,
        resume_last_updated=None,
        assigned_champion_name=MOCK_CHAMPION_NAME,
        latest_score=54,
        readiness_score=49,
        average_score=52,
        completed_interviews=2,
        total_practice_minutes=46,
        last_practice_date="2026-06-20",
        last_interview_date="2026-06-20",
        upcoming_meeting_date="2026-07-14",
        status="needs_help",
        score_trend=[
            {"date": "2026-06-05", "score": 58},
            {"date": "2026-06-20", "score": 54},
        ],
        skills=[
            {"skill": "Communication", "score": 55, "status": "needs_practice", "recommendation": "Slow down and answer the full question."},
            {"skill": "Confidence", "score": 48, "status": "needs_help", "recommendation": "Schedule a 1:1 confidence-building session."},
            {"skill": "Response Structure", "score": 50, "status": "needs_help", "recommendation": "Introduce the STAR method with a worksheet."},
        ],
    ),
    StudentDetail(
        id="stu-004",
        first_name="Sofia",
        last_name="Chen",
        email="sofia.chen@example.edu",
        phone=None,
        school="Whitney Young High School",
        education_level="high_school",
        year="Junior",
        field_pursuing="Undecided",
        goal_type="college",
        gpa=4.0,
        resume_uploaded=True,
        resume_url="#",
        resume_last_updated="2026-05-30",
        assigned_champion_name=MOCK_CHAMPION_NAME,
        latest_score=93,
        readiness_score=91,
        average_score=90,
        completed_interviews=8,
        total_practice_minutes=302,
        last_practice_date="2026-07-10",
        last_interview_date="2026-07-10",
        upcoming_meeting_date="2026-07-16",
        status="excellent",
        score_trend=[
            {"date": "2026-05-10", "score": 80},
            {"date": "2026-05-28", "score": 84},
            {"date": "2026-06-15", "score": 88},
            {"date": "2026-06-30", "score": 90},
            {"date": "2026-07-10", "score": 93},
        ],
        skills=[
            {"skill": "Communication", "score": 94, "status": "strong", "recommendation": "Outstanding clarity — mentor peers next."},
            {"skill": "Leadership", "score": 89, "status": "strong", "recommendation": "Highlight leadership stories in essays too."},
            {"skill": "Professionalism", "score": 95, "status": "strong", "recommendation": "Exceptional poise."},
        ],
    ),
    StudentDetail(
        id="stu-005",
        first_name="Devon",
        last_name="Washington",
        email="devon.washington@example.edu",
        phone="(708) 555-0170",
        school="City Colleges of Chicago",
        education_level="recent_grad",
        year="Recent Graduate",
        field_pursuing="Information Technology",
        goal_type="job",
        gpa=3.3,
        resume_uploaded=True,
        resume_url="#",
        resume_last_updated="2026-06-12",
        assigned_champion_name=MOCK_CHAMPION_NAME,
        latest_score=71,
        readiness_score=63,
        average_score=67,
        completed_interviews=5,
        total_practice_minutes=176,
        last_practice_date="2026-06-24",
        last_interview_date="2026-06-24",
        upcoming_meeting_date=None,
        status="watch",
        score_trend=[
            {"date": "2026-05-15", "score": 72},
            {"date": "2026-05-30", "score": 75},
            {"date": "2026-06-12", "score": 70},
            {"date": "2026-06-24", "score": 71},
        ],
        skills=[
            {"skill": "Technical Knowledge", "score": 74, "status": "good", "recommendation": "Refresh networking and OS fundamentals."},
            {"skill": "Problem Solving", "score": 68, "status": "needs_practice", "recommendation": "Think aloud during troubleshooting prompts."},
            {"skill": "Time Management", "score": 62, "status": "needs_practice", "recommendation": "Budget time across multi-part questions."},
        ],
    ),
    StudentDetail(
        id="stu-006",
        first_name="Amara",
        last_name="Okafor",
        email="amara.okafor@example.edu",
        phone=None,
        school="Northeastern Illinois University",
        education_level="college",
        year="Junior",
        field_pursuing="Public Health",
        goal_type="internship",
        gpa=3.6,
        resume_uploaded=False,
        resume_url=None,
        resume_last_updated=None,
        assigned_champion_name=MOCK_CHAMPION_NAME,
        latest_score=None,
        readiness_score=None,
        average_score=None,
        completed_interviews=0,
        total_practice_minutes=0,
        last_practice_date=None,
        last_interview_date=None,
        upcoming_meeting_date="2026-07-18",
        status="not_started",
        score_trend=[],
        skills=[],
    ),
]

INTERVIEWS: list[InterviewReviewDetail] = [
    InterviewReviewDetail(
        id="int-1001",
        student_id="stu-001",
        student_name="Jordan Alvarez",
        interview_purpose="college",
        question_mode="behavioral",
        date="2026-07-09",
        score=88,
        status="completed",
        review_status="pending",
        questions=[
            "Tell me about a time you led a team through a challenge.",
            "Why do you want to study Computer Science?",
            "Describe a project you are proud of.",
        ],
        transcript_summary=(
            "Jordan gave structured answers using the STAR method, with concrete "
            "examples from a robotics club project and strong reflection."
        ),
        feedback_summary=(
            "Confident, well-organized responses. Strongest area was communication; "
            "could add more measurable outcomes."
        ),
        score_breakdown=[
            {"label": "Communication", "score": 88},
            {"label": "Structure", "score": 85},
            {"label": "Confidence", "score": 82},
            {"label": "Relevance", "score": 90},
        ],
        strengths=["Clear STAR structure", "Specific project examples", "Reflective tone"],
        improvement_areas=["Quantify outcomes", "Reduce filler words"],
        recommended_next_practice="Behavioral interview focused on measurable impact.",
        champion_review_notes=None,
    ),
    InterviewReviewDetail(
        id="int-1002",
        student_id="stu-003",
        student_name="Marcus Bell",
        interview_purpose="scholarship",
        question_mode="situational",
        date="2026-06-20",
        score=54,
        status="completed",
        review_status="needs_follow_up",
        questions=[
            "Why do you deserve this scholarship?",
            "Describe a time you overcame a setback.",
        ],
        transcript_summary=(
            "Marcus answered briefly and drifted off-topic on the second question. "
            "Answers lacked structure and specific examples."
        ),
        feedback_summary=(
            "Needs support building structured answers and confidence. Recommend a "
            "1:1 and a STAR worksheet."
        ),
        score_breakdown=[
            {"label": "Communication", "score": 55},
            {"label": "Structure", "score": 50},
            {"label": "Confidence", "score": 48},
            {"label": "Relevance", "score": 58},
        ],
        strengths=["Authentic and sincere", "Motivated to improve"],
        improvement_areas=["Answer the full question", "Use a clear structure", "Build confidence"],
        recommended_next_practice="Situational practice with STAR scaffolding + resume upload.",
        champion_review_notes="Scheduled a 1:1 for July 14 to work on structure.",
    ),
    InterviewReviewDetail(
        id="int-1003",
        student_id="stu-004",
        student_name="Sofia Chen",
        interview_purpose="college",
        question_mode="mixed",
        date="2026-07-10",
        score=93,
        status="completed",
        review_status="reviewed",
        questions=[
            "Walk me through your extracurricular leadership.",
            "How do you handle competing deadlines?",
            "What impact do you want to make in college?",
        ],
        transcript_summary=(
            "Sofia delivered polished, well-structured answers with strong leadership "
            "examples and clear future goals."
        ),
        feedback_summary="Excellent across the board. Ready for top-tier college interviews.",
        score_breakdown=[
            {"label": "Communication", "score": 94},
            {"label": "Structure", "score": 92},
            {"label": "Confidence", "score": 91},
            {"label": "Relevance", "score": 95},
        ],
        strengths=["Exceptional clarity", "Strong leadership stories", "Confident delivery"],
        improvement_areas=["Occasionally over-explains"],
        recommended_next_practice="Advanced mock with rapid follow-up questions.",
        champion_review_notes="Great progress — encouraged her to mentor peers.",
    ),
    InterviewReviewDetail(
        id="int-1004",
        student_id="stu-002",
        student_name="Priya Nair",
        interview_purpose="internship",
        question_mode="behavioral",
        date="2026-07-07",
        score=76,
        status="completed",
        review_status="pending",
        questions=[
            "Tell me about a time you worked on a team.",
            "What is a business problem you find interesting?",
        ],
        transcript_summary=(
            "Priya gave solid answers but started slowly. Good content once warmed up."
        ),
        feedback_summary="Solid foundation. Focus on strong openings and confident pacing.",
        score_breakdown=[
            {"label": "Communication", "score": 74},
            {"label": "Structure", "score": 70},
            {"label": "Confidence", "score": 68},
            {"label": "Relevance", "score": 78},
        ],
        strengths=["Good examples", "Clear motivation"],
        improvement_areas=["Stronger openings", "More confident pacing"],
        recommended_next_practice="Behavioral practice focused on the first 30 seconds.",
        champion_review_notes=None,
    ),
    InterviewReviewDetail(
        id="int-1005",
        student_id="stu-005",
        student_name="Devon Washington",
        interview_purpose="job",
        question_mode="technical",
        date="2026-06-24",
        score=71,
        status="completed",
        review_status="pending",
        questions=[
            "Explain the difference between TCP and UDP.",
            "How would you troubleshoot a slow network?",
        ],
        transcript_summary=(
            "Devon showed good fundamentals but hesitated on troubleshooting steps and "
            "ran long on the first answer."
        ),
        feedback_summary="Decent technical base; work on thinking aloud and time management.",
        score_breakdown=[
            {"label": "Technical", "score": 74},
            {"label": "Structure", "score": 68},
            {"label": "Confidence", "score": 65},
            {"label": "Time Mgmt", "score": 62},
        ],
        strengths=["Solid fundamentals", "Professional presence"],
        improvement_areas=["Think aloud", "Manage time across parts"],
        recommended_next_practice="Technical screen with a 3-minute-per-question limit.",
        champion_review_notes=None,
    ),
]

NOTES: list[ChampionNote] = [
    ChampionNote(
        id="note-2001",
        student_id="stu-001",
        student_name="Jordan Alvarez",
        champion_name=MOCK_CHAMPION_NAME,
        content=(
            "Great job improving your communication. For your next practice, focus on "
            "using more specific, measurable examples."
        ),
        visibility="student_visible",
        category="interview_feedback",
        created_at="2026-07-09",
        updated_at=None,
    ),
    ChampionNote(
        id="note-2002",
        student_id="stu-003",
        student_name="Marcus Bell",
        champion_name=MOCK_CHAMPION_NAME,
        content=(
            "Marcus is showing low confidence and hasn't uploaded a resume. Flagging "
            "for closer follow-up."
        ),
        visibility="private",
        category="follow_up",
        created_at="2026-06-21",
        updated_at=None,
    ),
    ChampionNote(
        id="note-2003",
        student_id="stu-003",
        student_name="Marcus Bell",
        champion_name=MOCK_CHAMPION_NAME,
        content=(
            "You showed up and gave it your best — that matters. Let's work together on "
            "structuring your answers using the STAR method."
        ),
        visibility="student_visible",
        category="encouragement",
        created_at="2026-06-21",
        updated_at=None,
    ),
    ChampionNote(
        id="note-2004",
        student_id="stu-004",
        student_name="Sofia Chen",
        champion_name=MOCK_CHAMPION_NAME,
        content="Excellent readiness. Consider nominating for the peer mentor program.",
        visibility="private",
        category="general",
        created_at="2026-07-10",
        updated_at=None,
    ),
]

ASSIGNMENTS: list[PracticeAssignment] = [
    PracticeAssignment(
        id="asg-3001",
        student_id="stu-002",
        student_name="Priya Nair",
        interview_purpose="internship",
        question_mode="behavioral",
        focus_skill="Confidence",
        resume_based=True,
        due_date="2026-07-16",
        instructions="Focus on strong openings. Review the first 30 seconds of each answer.",
        status="assigned",
        created_at="2026-07-08",
    ),
    PracticeAssignment(
        id="asg-3002",
        student_id="stu-003",
        student_name="Marcus Bell",
        interview_purpose="scholarship",
        question_mode="situational",
        focus_skill="Response Structure",
        resume_based=False,
        due_date="2026-07-13",
        instructions="Complete two situational questions using the STAR worksheet.",
        status="overdue",
        created_at="2026-06-28",
    ),
    PracticeAssignment(
        id="asg-3003",
        student_id="stu-005",
        student_name="Devon Washington",
        interview_purpose="job",
        question_mode="technical",
        focus_skill="Time Management",
        resume_based=True,
        due_date="2026-07-20",
        instructions="Technical screen with a 3-minute limit per question.",
        status="in_progress",
        created_at="2026-07-05",
    ),
]

MEETINGS: list[Meeting] = [
    Meeting(
        id="mtg-4001",
        student_id="stu-003",
        student_name="Marcus Bell",
        title="Confidence & structure 1:1",
        meeting_type="interview_prep",
        start_time=datetime(2026, 7, 14, 15, 0),
        end_time=datetime(2026, 7, 14, 15, 30),
        status="scheduled",
        meeting_url="https://meet.example.com/marcus-1on1",
    ),
    Meeting(
        id="mtg-4002",
        student_id="stu-001",
        student_name="Jordan Alvarez",
        title="College interview prep",
        meeting_type="mock_interview",
        start_time=datetime(2026, 7, 15, 17, 0),
        end_time=datetime(2026, 7, 15, 17, 45),
        status="scheduled",
        meeting_url="https://meet.example.com/jordan-college",
    ),
    Meeting(
        id="mtg-4003",
        student_id="stu-004",
        student_name="Sofia Chen",
        title="Advanced mock interview",
        meeting_type="mock_interview",
        start_time=datetime(2026, 7, 16, 16, 0),
        end_time=datetime(2026, 7, 16, 16, 45),
        status="scheduled",
        meeting_url=None,
    ),
    Meeting(
        id="mtg-4005",
        student_id="stu-002",
        student_name="Priya Nair",
        title="Internship strategy check-in",
        meeting_type="career_question",
        start_time=datetime(2026, 6, 30, 15, 30),
        end_time=datetime(2026, 6, 30, 16, 0),
        status="completed",
        meeting_url=None,
    ),
]
