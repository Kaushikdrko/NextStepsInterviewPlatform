from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_student, require_user_ownership
from app.schemas.onboarding_summary import OnboardingSummaryResponse
from app.services.onboarding_service import get_onboarding_summary

router = APIRouter(prefix="/onboarding-summary", tags=["onboarding summary"])


@router.get("/{user_id}", response_model=OnboardingSummaryResponse)
def get_summary_for_user(
    user_id: str,
    current_user_id: str = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    require_user_ownership(user_id, current_user_id)
    # This endpoint packages onboarding data into one AI-ready object so the
    # interview generator can build prompts without knowing the database schema.
    return get_onboarding_summary(db, user_id)
