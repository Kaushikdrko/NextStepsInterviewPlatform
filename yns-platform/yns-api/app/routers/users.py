from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AppUser
from app.schemas.user import UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db)):
    return db.query(AppUser).order_by(AppUser.created_at.desc().nullslast()).all()


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.get(AppUser, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    return user
