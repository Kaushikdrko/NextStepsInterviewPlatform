"""Champion Dashboard API routes.

Mounted at ``/api/champion`` in ``app/main.py``. Responses use the schemas in
``models.py`` (camelCase JSON) and are backed by the temporary service layer.
"""

from fastapi import APIRouter, HTTPException

from app.api.champion import service
from app.api.champion.mock_data import MOCK_CHAMPION_ID
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
    StudentProgress,
    StudentSummary,
    UpdateAssignmentRequest,
    UpdateNoteRequest,
    UpdateReviewRequest,
)

router = APIRouter()


# TEMP: resolve the "current" champion. Once auth is wired, replace this with a
# dependency that reads the Supabase JWT (see app/dependencies.py) and verifies
# the user's ``user_type`` is a champion/admin. Kept as a plain call so the shared
# dependencies module is untouched for now.
def current_champion_id() -> str:
    return MOCK_CHAMPION_ID


# --- Dashboard overview ---------------------------------------------------


@router.get("/dashboard/summary", response_model=DashboardSummary)
def dashboard_summary():
    return service.get_dashboard_summary(current_champion_id())


@router.get("/dashboard/alerts", response_model=list[AttentionAlert])
def dashboard_alerts():
    return service.get_attention_alerts(current_champion_id())


@router.get("/dashboard/activity", response_model=list[ActivityItem])
def dashboard_activity(limit: int = 6):
    return service.get_recent_activity(current_champion_id(), limit=limit)


# --- Students -------------------------------------------------------------


@router.get("/students", response_model=list[StudentSummary])
def list_students():
    return service.get_assigned_students(current_champion_id())


@router.get("/students/{student_id}", response_model=StudentDetail)
def get_student(student_id: str):
    student = service.get_student_detail(current_champion_id(), student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found or not assigned to you")
    return student


@router.get("/students/{student_id}/progress", response_model=StudentProgress)
def get_student_progress(student_id: str):
    student = service.get_student_detail(current_champion_id(), student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found or not assigned to you")
    return StudentProgress(score_trend=student.score_trend, skills=student.skills)


@router.get("/students/{student_id}/notes", response_model=list[ChampionNote])
def get_student_notes(student_id: str):
    champion_id = current_champion_id()
    if not service.is_student_assigned(champion_id, student_id):
        raise HTTPException(status_code=404, detail="Student not found or not assigned to you")
    return service.get_notes(champion_id, student_id=student_id)


@router.post("/students/{student_id}/notes", response_model=ChampionNote, status_code=201)
def create_student_note(student_id: str, payload: CreateNoteRequest):
    note = service.create_note(current_champion_id(), student_id, payload)
    if note is None:
        raise HTTPException(status_code=404, detail="Student not found or not assigned to you")
    return note


@router.post("/students/{student_id}/assignments", response_model=PracticeAssignment, status_code=201)
def create_student_assignment(student_id: str, payload: CreateAssignmentRequest):
    assignment = service.create_assignment(current_champion_id(), student_id, payload)
    if assignment is None:
        raise HTTPException(status_code=404, detail="Student not found or not assigned to you")
    return assignment


# --- Interviews -----------------------------------------------------------


@router.get("/interviews", response_model=list[InterviewReview])
def list_interviews():
    return service.get_interview_reviews(current_champion_id())


@router.get("/interviews/{interview_id}", response_model=InterviewReviewDetail)
def get_interview(interview_id: str):
    detail = service.get_interview_detail(current_champion_id(), interview_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Interview not found or not accessible")
    return detail


@router.patch("/interviews/{interview_id}/review", response_model=InterviewReviewDetail)
def review_interview(interview_id: str, payload: UpdateReviewRequest):
    detail = service.update_interview_review(
        current_champion_id(), interview_id, payload.review_status, payload.champion_review_notes
    )
    if detail is None:
        raise HTTPException(status_code=404, detail="Interview not found or not accessible")
    return detail


# --- Notes ----------------------------------------------------------------


@router.get("/notes", response_model=list[ChampionNote])
def list_notes():
    return service.get_notes(current_champion_id())


@router.patch("/notes/{note_id}", response_model=ChampionNote)
def patch_note(note_id: str, payload: UpdateNoteRequest):
    note = service.update_note(
        current_champion_id(), note_id, payload.content, payload.visibility, payload.category
    )
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found or not accessible")
    return note


@router.delete("/notes/{note_id}", status_code=204)
def remove_note(note_id: str):
    if not service.delete_note(current_champion_id(), note_id):
        raise HTTPException(status_code=404, detail="Note not found or not accessible")
    return None


# --- Assignments ----------------------------------------------------------


@router.get("/assignments", response_model=list[PracticeAssignment])
def list_assignments():
    return service.get_assignments(current_champion_id())


@router.patch("/assignments/{assignment_id}", response_model=PracticeAssignment)
def patch_assignment(assignment_id: str, payload: UpdateAssignmentRequest):
    assignment = service.update_assignment(
        current_champion_id(), assignment_id, payload.status, payload.due_date, payload.instructions
    )
    if assignment is None:
        raise HTTPException(status_code=404, detail="Assignment not found or not accessible")
    return assignment


# --- Meetings -------------------------------------------------------------


@router.get("/meetings", response_model=list[Meeting])
def list_meetings():
    return service.get_meetings(current_champion_id())


# --- Settings -------------------------------------------------------------


@router.get("/settings", response_model=ChampionSettings)
def get_settings():
    return service.get_settings(current_champion_id())


@router.patch("/settings", response_model=ChampionSettings)
def update_settings(payload: ChampionSettings):
    return service.update_settings(current_champion_id(), payload)
