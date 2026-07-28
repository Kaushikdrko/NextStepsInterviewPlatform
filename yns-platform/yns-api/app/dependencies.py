from typing import Any

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.middleware.auth import verify_supabase_jwt

security = HTTPBearer(auto_error=False)


CHAMPION_ROLES = frozenset({"champion", "admin"})


def _metadata_roles(value: Any) -> set[str]:
    if isinstance(value, str):
        return {value}
    if isinstance(value, list):
        return {item for item in value if isinstance(item, str)}
    return set()


def _claim_roles(claims: dict[str, Any]) -> set[str]:
    app_metadata = claims.get("app_metadata") or {}
    user_metadata = claims.get("user_metadata") or {}

    return {
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


def _claims_subject(claims: dict[str, Any]) -> str:
    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id


def get_current_claims(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict[str, Any]:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")

    return verify_supabase_jwt(credentials.credentials)


def get_current_student(
    claims: dict[str, Any] = Depends(get_current_claims),
) -> str:
    return _claims_subject(claims)


def require_admin_user(claims: dict[str, Any] = Depends(get_current_claims)) -> str:
    app_metadata = claims.get("app_metadata") or {}
    user_metadata = claims.get("user_metadata") or {}

    if (
        "admin" not in _claim_roles(claims)
        and app_metadata.get("admin") is not True
        and user_metadata.get("admin") is not True
    ):
        raise HTTPException(status_code=403, detail="Admin access required")

    return _claims_subject(claims)


def require_champion_user(claims: dict[str, Any] = Depends(get_current_claims)) -> str:
    """Authorize the Champion Dashboard.

    The role lives in the Supabase JWT (``app_metadata.role`` / ``roles``), not in
    a database column — see ``require_admin_user`` for the same pattern. Grant it
    with the Supabase admin API:

        supabase.auth.admin.update_user_by_id(uid, {"app_metadata": {"role": "champion"}})

    Champions are not scoped to individual students: every authorized champion
    sees the same organization-wide data, so this returns only the caller's id
    for logging/profile lookups and never filters query results by it.
    """
    if _claim_roles(claims).isdisjoint(CHAMPION_ROLES):
        raise HTTPException(status_code=403, detail="Champion access required")

    return _claims_subject(claims)


def require_user_ownership(user_id: str, current_user_id: str) -> None:
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this user's data")
