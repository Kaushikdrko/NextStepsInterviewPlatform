from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CareerProfile
from app.schemas.career_profile import CareerProfileResponse

router = APIRouter(prefix="/career-profiles", tags=["career profiles"])


@router.get("", response_model=list[CareerProfileResponse])
def list_career_profiles(db: Session = Depends(get_db)):
    return db.query(CareerProfile).order_by(CareerProfile.created_at.desc().nullslast()).all()


@router.get("/user/{user_id}", response_model=CareerProfileResponse)
def get_career_profile_for_user(user_id: str, db: Session = Depends(get_db)):
    profile = (
        db.query(CareerProfile)
        .filter(CareerProfile.user_id == user_id)
        .order_by(CareerProfile.created_at.desc().nullslast())
        .first()
    )

    if not profile:
        raise HTTPException(status_code=404, detail="Career profile not found.")

    return profile
