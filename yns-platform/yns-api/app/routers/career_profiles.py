from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_student, require_admin_user, require_user_ownership
from app.models import CareerProfile
from app.schemas.career_profile import CareerProfileResponse

router = APIRouter(prefix="/career-profiles", tags=["career profiles"])


@router.get("", response_model=list[CareerProfileResponse])
def list_career_profiles(
    _admin_user_id: str = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    return db.query(CareerProfile).order_by(CareerProfile.created_at.desc().nullslast()).all()


@router.get("/user/{user_id}", response_model=CareerProfileResponse)
def get_career_profile_for_user(
    user_id: str,
    current_user_id: str = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    require_user_ownership(user_id, current_user_id)
    profile = (
        db.query(CareerProfile)
        .filter(CareerProfile.user_id == user_id)
        .order_by(CareerProfile.created_at.desc().nullslast())
        .first()
    )

    if not profile:
        raise HTTPException(status_code=404, detail="Career profile not found.")

    return profile
