"""Champion (Admin) Dashboard API routes.

All endpoints currently return hardcoded data from `data.py`. The route shapes
and response models are stable, so swapping in real PostgreSQL queries later
will not require frontend changes.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.api.admin import data
from app.api.admin.models import (
    AssignmentResponse,
    Champion,
    CreateAssignmentRequest,
    CreateNoteRequest,
    DashboardSummary,
    InterviewSession,
    Meeting,
    MentorNote,
    ProgressPoint,
    Student,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/me", response_model=Champion)
def get_current_champion() -> Champion:
    """Return the currently signed-in champion (mocked for now)."""
    return data.CHAMPION


@router.get("/dashboard/summary", response_model=DashboardSummary)
def get_dashboard_summary() -> DashboardSummary:
    """Top-of-dashboard metric cards."""
    return data.SUMMARY


@router.get("/students", response_model=list[Student])
def list_students() -> list[Student]:
    """All students assigned to the champion."""
    return data.STUDENTS


@router.get("/students/{student_id}", response_model=Student)
def get_student(student_id: str) -> Student:
    """A single student's full profile."""
    student = data.STUDENTS_BY_ID.get(student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.get(
    "/students/{student_id}/interviews",
    response_model=list[InterviewSession],
)
def get_student_interviews(student_id: str) -> list[InterviewSession]:
    """Recent interview sessions for a student."""
    student = data.STUDENTS_BY_ID.get(student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    curated = data.INTERVIEWS_BY_STUDENT.get(student_id)
    return curated if curated is not None else data.build_fallback_interviews(student)


@router.get(
    "/students/{student_id}/progress",
    response_model=list[ProgressPoint],
)
def get_student_progress(student_id: str) -> list[ProgressPoint]:
    """Interview score progression over time for the line chart."""
    student = data.STUDENTS_BY_ID.get(student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    curated = data.PROGRESS_BY_STUDENT.get(student_id)
    return (
        curated
        if curated is not None
        else data.build_fallback_progress(student.latest_score)
    )


@router.get("/meetings", response_model=list[Meeting])
def list_meetings() -> list[Meeting]:
    """Upcoming champion/student meetings."""
    return data.MEETINGS


@router.post("/students/{student_id}/notes", response_model=MentorNote)
def create_note(student_id: str, body: CreateNoteRequest) -> MentorNote:
    """Save a note for a student (visible to student) or a private mentor note.

    Currently echoes the saved note back. Persist to PostgreSQL later.
    """
    if student_id not in data.STUDENTS_BY_ID:
        raise HTTPException(status_code=404, detail="Student not found")
    return MentorNote(
        id=f"note-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        student_id=student_id,
        champion_id=data.CHAMPION_ID,
        note=body.note,
        visibility=body.visibility,
        created_at=datetime.now(timezone.utc),
    )


@router.post(
    "/students/{student_id}/assignments",
    response_model=AssignmentResponse,
)
def assign_student(
    student_id: str, body: CreateAssignmentRequest
) -> AssignmentResponse:
    """Assign a student to a champion. Echoes the assignment for now."""
    if student_id not in data.STUDENTS_BY_ID:
        raise HTTPException(status_code=404, detail="Student not found")
    return AssignmentResponse(
        student_id=student_id,
        champion_id=body.champion_id,
        assigned=True,
    )
