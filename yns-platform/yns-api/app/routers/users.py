from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_student, require_admin_user, require_user_ownership
from app.models import AppUser
from app.schemas.user import UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
def list_users(
    _admin_user_id: str = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    return db.query(AppUser).order_by(AppUser.created_at.desc().nullslast()).all()


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    current_user_id: str = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    require_user_ownership(user_id, current_user_id)
    user = db.get(AppUser, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    return user
