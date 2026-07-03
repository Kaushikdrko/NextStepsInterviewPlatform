from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user_skill import UserSkillsResponse
from app.services.onboarding_service import get_user_skills

router = APIRouter(prefix="/user-skills", tags=["user skills"])


@router.get("/user/{user_id}", response_model=UserSkillsResponse)
def get_skills_for_user(user_id: str, db: Session = Depends(get_db)):
    return UserSkillsResponse(user_id=user_id, skills=get_user_skills(db, user_id))
