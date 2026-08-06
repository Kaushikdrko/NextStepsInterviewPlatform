from fastapi import APIRouter, Depends, HTTPException

from app.api.reports.models import GenerateReportResponse
from app.core.assistants.reporter import generate_report
from app.dependencies import get_current_student
from app.services.profile_store import build_student_profile, get_student_profile
from app.services.supabase_client import (
    get_report_for_session,
    get_session_with_plan,
    get_turns_for_session,
    write_report,
)

router = APIRouter()


def _get_owned_session(session_id: str, user_id: str) -> dict:
    session = get_session_with_plan(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")
    return session


@router.get("/{session_id}", response_model=GenerateReportResponse)
def get_report(
    session_id: str,
    user_id: str = Depends(get_current_student),
):
    _get_owned_session(session_id, user_id)

    report = get_report_for_session(session_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    return GenerateReportResponse(
        report={
            "overall": report["overall"],
            "category_breakdown": report["category_breakdown"],
            "strengths": report["strengths"],
            "growth_areas": report["growth_areas"],
            "recommended_next_steps": report["recommended_next_steps"],
        }
    )


@router.post("/{session_id}", response_model=GenerateReportResponse)
def create_report(
    session_id: str,
    user_id: str = Depends(get_current_student),
):
    session = _get_owned_session(session_id, user_id)

    all_turns = get_turns_for_session(session_id)

    raw_profile = get_student_profile(user_id)
    if raw_profile is None:
        raise HTTPException(status_code=404, detail="Profile not found — complete onboarding first")
    profile = build_student_profile(raw_profile)

    report = generate_report(session, all_turns, profile)

    write_report(
        {
            "session_id": session_id,
            "overall": report.overall,
            "category_breakdown": [c.model_dump() for c in report.category_breakdown],
            "strengths": report.strengths,
            "growth_areas": report.growth_areas,
            "recommended_next_steps": report.recommended_next_steps,
        }
    )

    return GenerateReportResponse(report=report)
