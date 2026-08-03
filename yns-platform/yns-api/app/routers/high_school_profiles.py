from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_student, require_admin_user, require_user_ownership
from app.models import CareerProfile
from app.schemas.high_school_profile import HighSchoolProfileResponse

router = APIRouter(prefix="/high-school-profiles", tags=["high school profiles"])


@router.get("", response_model=list[HighSchoolProfileResponse])
def list_high_school_profiles(
    _admin_user_id: str = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    profiles = (
        db.query(CareerProfile)
        .filter(CareerProfile.grade_level.isnot(None))
        .order_by(CareerProfile.created_at.desc().nullslast())
        .all()
    )

    return [_to_high_school_response(profile) for profile in profiles]


@router.get("/user/{user_id}", response_model=HighSchoolProfileResponse)
def get_high_school_profile_for_user(
    user_id: str,
    current_user_id: str = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    require_user_ownership(user_id, current_user_id)
    profile = (
        db.query(CareerProfile)
        .filter(CareerProfile.user_id == user_id)
        .filter(CareerProfile.grade_level.isnot(None))
        .order_by(CareerProfile.created_at.desc().nullslast())
        .first()
    )

    if not profile:
        raise HTTPException(status_code=404, detail="High school profile not found.")

    return _to_high_school_response(profile)


def _to_high_school_response(profile: CareerProfile) -> dict:
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "grade": profile.grade_level,
        "colleges": profile.colleges_preparing_for or [],
        "intended_major": profile.intended_major or profile.target_field,
        "interview_type": profile.interview_type,
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }
