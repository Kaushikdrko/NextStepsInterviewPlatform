from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.middleware.auth import get_user_id_from_token

security = HTTPBearer()


def get_current_student(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    return get_user_id_from_token(credentials.credentials)
