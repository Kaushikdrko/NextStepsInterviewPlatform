from typing import Any

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.middleware.auth import verify_supabase_jwt

security = HTTPBearer(auto_error=False)


def _metadata_roles(value: Any) -> set[str]:
    if isinstance(value, str):
        return {value}
    if isinstance(value, list):
        return {item for item in value if isinstance(item, str)}
    return set()


def get_current_claims(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict[str, Any]:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")

    return verify_supabase_jwt(credentials.credentials)


def get_current_student(
    claims: dict[str, Any] = Depends(get_current_claims),
) -> str:
    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id


def require_admin_user(claims: dict[str, Any] = Depends(get_current_claims)) -> str:
    app_metadata = claims.get("app_metadata") or {}
    user_metadata = claims.get("user_metadata") or {}

    roles = {
        item
        for item in {
            claims.get("role"),
            app_metadata.get("role"),
            user_metadata.get("role"),
            *_metadata_roles(app_metadata.get("roles")),
            *_metadata_roles(user_metadata.get("roles")),
        }
        if isinstance(item, str)
    }

    if "admin" not in roles and app_metadata.get("admin") is not True and user_metadata.get("admin") is not True:
        raise HTTPException(status_code=403, detail="Admin access required")

    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user_id


def require_user_ownership(user_id: str, current_user_id: str) -> None:
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this user's data")
