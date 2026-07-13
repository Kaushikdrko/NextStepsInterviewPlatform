"""Service layer for the Champion Dashboard.

TEMPORARY: reads/writes operate on the in-memory fixtures in ``mock_data.py``.
Swap each function body for real DB/Supabase queries when the Champion tables
land; the router and response models will not need to change.

Authorization rules enforced here (backend, not just the frontend):
  * A Champion only sees students assigned to them.
  * A Champion only sees interviews / notes / assignments / meetings for
    assigned students.
  * Private mentor notes are NEVER included in student-facing responses
    (see ``notes_visible_to_student``). Frontend filtering alone is not enough.
"""

from datetime import datetime, timezone

from app.api.champion import mock_data
from app.api.champion.models import (
    ActivityItem,
    AttentionAlert,
    ChampionNote,
    ChampionSettings,
    CreateAssignmentRequest,
    CreateNoteRequest,
    DashboardSummary,
    InterviewReview,
    InterviewReviewDetail,
    Meeting,
    PracticeAssignment,
    StudentDetail,
    StudentSummary,
)


def _student_name(student_id: str) -> str:
    for student in mock_data.STUDENTS:
        if student.id == student_id:
            return f"{student.first_name} {student.last_name}"
    return "Unknown student"


def _assigned_student_ids(champion_id: str) -> set[str]:
    # TEMP: every fixture student is assigned to the mock champion. With a real
    # DB this becomes ``select id from students where assigned_champion_id = ...``.
    return {student.id for student in mock_data.STUDENTS}


def is_student_assigned(champion_id: str, student_id: str) -> bool:
    return student_id in _assigned_student_ids(champion_id)


def get_assigned_students(champion_id: str) -> list[StudentSummary]:
    assigned = _assigned_student_ids(champion_id)
    return [
        StudentSummary(**student.model_dump())
        for student in mock_data.STUDENTS
        if student.id in assigned
    ]


def get_student_detail(champion_id: str, student_id: str) -> StudentDetail | None:
    if not is_student_assigned(champion_id, student_id):
        return None
    for student in mock_data.STUDENTS:
        if student.id == student_id:
            return student
    return None


def _days_since(date_str: str | None) -> int | None:
    if not date_str:
        return None
    parsed = datetime.fromisoformat(date_str)
    return (datetime.now() - parsed).days


def get_dashboard_summary(champion_id: str) -> DashboardSummary:
    students = get_assigned_students(champion_id)
    readiness = [s.readiness_score for s in students if s.readiness_score is not None]
    overall = round(sum(readiness) / len(readiness)) if readiness else None

    interviews = get_interview_reviews(champion_id)
    pending = sum(1 for i in interviews if i.review_status != "reviewed")

    now = datetime.now()
    upcoming = sum(
        1
        for m in get_meetings(champion_id)
        if m.status == "scheduled" and m.start_time.replace(tzinfo=None) >= now
    )

    due = sum(
        1
        for a in get_assignments(champion_id)
        if a.status in {"assigned", "in_progress", "overdue"}
    )

    return DashboardSummary(
        assigned_students_count=len(students),
        interviews_completed_count=sum(s.completed_interviews for s in students),
        students_needing_help_count=sum(1 for s in students if s.status == "needs_help"),
        overall_readiness_score=overall,
        pending_reviews_count=pending,
        upcoming_meetings_count=upcoming,
        assignments_due_count=due,
    )


def get_attention_alerts(champion_id: str) -> list[AttentionAlert]:
    alerts: list[AttentionAlert] = []
    for student in get_assigned_students(champion_id):
        name = f"{student.first_name} {student.last_name}"
        if student.status == "needs_help":
            alerts.append(AttentionAlert(id=f"alert-help-{student.id}", student_id=student.id, student_name=name, reason="Low average score — needs a 1:1 check-in", status="needs_help"))
            continue
        if student.status == "not_started":
            alerts.append(AttentionAlert(id=f"alert-start-{student.id}", student_id=student.id, student_name=name, reason="Has not started any practice interviews yet", status="not_started"))
            continue
        inactive = _days_since(student.last_practice_date)
        if inactive is not None and inactive >= 14:
            alerts.append(AttentionAlert(id=f"alert-inactive-{student.id}", student_id=student.id, student_name=name, reason=f"No practice in {inactive} days", status="watch"))

    for interview in get_interview_reviews(champion_id):
        if interview.review_status == "pending":
            alerts.append(AttentionAlert(id=f"alert-review-{interview.id}", student_id=interview.student_id, student_name=interview.student_name, reason="Interview is awaiting your review", status="watch"))
    return alerts


def get_recent_activity(champion_id: str, limit: int = 6) -> list[ActivityItem]:
    interviews = sorted(get_interview_reviews(champion_id), key=lambda i: i.date, reverse=True)
    return [
        ActivityItem(
            id=i.id,
            student_id=i.student_id,
            student_name=i.student_name,
            interview_purpose=i.interview_purpose,
            question_mode=i.question_mode,
            score=i.score,
            date=i.date,
            review_status=i.review_status,
        )
        for i in interviews[:limit]
    ]


def get_interview_reviews(champion_id: str) -> list[InterviewReview]:
    assigned = _assigned_student_ids(champion_id)
    return [
        InterviewReview(**{k: v for k, v in i.model_dump().items() if k in InterviewReview.model_fields})
        for i in mock_data.INTERVIEWS
        if i.student_id in assigned
    ]


def get_interview_detail(champion_id: str, interview_id: str) -> InterviewReviewDetail | None:
    assigned = _assigned_student_ids(champion_id)
    for interview in mock_data.INTERVIEWS:
        if interview.id == interview_id and interview.student_id in assigned:
            return interview
    return None


def update_interview_review(
    champion_id: str, interview_id: str, review_status: str, notes: str | None
) -> InterviewReviewDetail | None:
    detail = get_interview_detail(champion_id, interview_id)
    if detail is None:
        return None
    detail.review_status = review_status  # type: ignore[assignment]
    if notes is not None:
        detail.champion_review_notes = notes
    return detail


def get_notes(champion_id: str, student_id: str | None = None) -> list[ChampionNote]:
    """All notes the Champion can see (both visibilities) for assigned students."""
    assigned = _assigned_student_ids(champion_id)
    notes = [n for n in mock_data.NOTES if n.student_id in assigned]
    if student_id is not None:
        notes = [n for n in notes if n.student_id == student_id]
    return sorted(notes, key=lambda n: n.created_at, reverse=True)


def notes_visible_to_student(student_id: str) -> list[ChampionNote]:
    """Student-facing view: ONLY student-visible notes.

    The student dashboard must call this (never ``get_notes``) so private mentor
    notes never leave the backend for a student request.
    """
    return [
        n
        for n in mock_data.NOTES
        if n.student_id == student_id and n.visibility == "student_visible"
    ]


def create_note(champion_id: str, student_id: str, payload: CreateNoteRequest) -> ChampionNote | None:
    if not is_student_assigned(champion_id, student_id):
        return None
    note = ChampionNote(
        id=f"note-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        student_id=student_id,
        student_name=_student_name(student_id),
        champion_name=mock_data.MOCK_CHAMPION_NAME,
        content=payload.content,
        visibility=payload.visibility,
        category=payload.category,
        created_at=datetime.now(timezone.utc).date().isoformat(),
        updated_at=None,
    )
    mock_data.NOTES.insert(0, note)
    return note


def update_note(
    champion_id: str, note_id: str, content: str | None, visibility: str | None, category: str | None
) -> ChampionNote | None:
    assigned = _assigned_student_ids(champion_id)
    for note in mock_data.NOTES:
        if note.id == note_id and note.student_id in assigned:
            if content is not None:
                note.content = content
            if visibility is not None:
                note.visibility = visibility  # type: ignore[assignment]
            if category is not None:
                note.category = category  # type: ignore[assignment]
            note.updated_at = datetime.now(timezone.utc).date().isoformat()
            return note
    return None


def delete_note(champion_id: str, note_id: str) -> bool:
    assigned = _assigned_student_ids(champion_id)
    for index, note in enumerate(mock_data.NOTES):
        if note.id == note_id and note.student_id in assigned:
            del mock_data.NOTES[index]
            return True
    return False


def get_assignments(champion_id: str) -> list[PracticeAssignment]:
    assigned = _assigned_student_ids(champion_id)
    items = [a for a in mock_data.ASSIGNMENTS if a.student_id in assigned]
    return sorted(items, key=lambda a: a.created_at, reverse=True)


def create_assignment(
    champion_id: str, student_id: str, payload: CreateAssignmentRequest
) -> PracticeAssignment | None:
    if not is_student_assigned(champion_id, student_id):
        return None
    assignment = PracticeAssignment(
        id=f"asg-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        student_id=student_id,
        student_name=_student_name(student_id),
        interview_purpose=payload.interview_purpose,
        question_mode=payload.question_mode,
        focus_skill=payload.focus_skill,
        resume_based=payload.resume_based,
        due_date=payload.due_date,
        instructions=payload.instructions,
        status="assigned",
        created_at=datetime.now(timezone.utc).date().isoformat(),
    )
    mock_data.ASSIGNMENTS.insert(0, assignment)
    return assignment


def update_assignment(
    champion_id: str, assignment_id: str, status: str | None, due_date: str | None, instructions: str | None
) -> PracticeAssignment | None:
    assigned = _assigned_student_ids(champion_id)
    for assignment in mock_data.ASSIGNMENTS:
        if assignment.id == assignment_id and assignment.student_id in assigned:
            if status is not None:
                assignment.status = status  # type: ignore[assignment]
            if due_date is not None:
                assignment.due_date = due_date
            if instructions is not None:
                assignment.instructions = instructions
            return assignment
    return None


def get_meetings(champion_id: str) -> list[Meeting]:
    assigned = _assigned_student_ids(champion_id)
    items = [m for m in mock_data.MEETINGS if m.student_id in assigned]
    return sorted(items, key=lambda m: m.start_time)


def get_settings(champion_id: str) -> ChampionSettings:
    return mock_data.CHAMPION_SETTINGS


def update_settings(champion_id: str, payload: ChampionSettings) -> ChampionSettings:
    mock_data.CHAMPION_SETTINGS = payload
    return mock_data.CHAMPION_SETTINGS
