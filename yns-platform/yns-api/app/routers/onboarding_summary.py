from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.onboarding_summary import OnboardingSummaryResponse
from app.services.onboarding_service import get_onboarding_summary

router = APIRouter(prefix="/onboarding-summary", tags=["onboarding summary"])


@router.get("/{user_id}", response_model=OnboardingSummaryResponse)
def get_summary_for_user(user_id: str, db: Session = Depends(get_db)):
    # This endpoint packages onboarding data into one AI-ready object so the
    # interview generator can build prompts without knowing the database schema.
    return get_onboarding_summary(db, user_id)
