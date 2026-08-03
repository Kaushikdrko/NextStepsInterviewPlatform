from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_student, require_user_ownership
from app.schemas.user_skill import UserSkillsResponse
from app.services.onboarding_service import get_user_skills

router = APIRouter(prefix="/user-skills", tags=["user skills"])


@router.get("/user/{user_id}", response_model=UserSkillsResponse)
def get_skills_for_user(
    user_id: str,
    current_user_id: str = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    require_user_ownership(user_id, current_user_id)
    return UserSkillsResponse(user_id=user_id, skills=get_user_skills(db, user_id))
