from typing import Any

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.middleware.auth import verify_firebase_token

security = HTTPBearer(auto_error=False)


CHAMPION_ROLES = frozenset({"champion", "admin"})


def _claim_roles(claims: dict[str, Any]) -> set[str]:
    roles: set[str] = set()

    role = claims.get("role")
    if isinstance(role, str):
        roles.add(role)

    extra_roles = claims.get("roles")
    if isinstance(extra_roles, str):
        roles.add(extra_roles)
    elif isinstance(extra_roles, list):
        roles.update(item for item in extra_roles if isinstance(item, str))

    return roles


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

    return verify_firebase_token(credentials.credentials)


def get_current_student(
    claims: dict[str, Any] = Depends(get_current_claims),
) -> str:
    return _claims_subject(claims)


def require_admin_user(claims: dict[str, Any] = Depends(get_current_claims)) -> str:
    if "admin" not in _claim_roles(claims):
        raise HTTPException(status_code=403, detail="Admin access required")

    return _claims_subject(claims)


def require_champion_user(claims: dict[str, Any] = Depends(get_current_claims)) -> str:
    """Authorize the Champion Dashboard.

    The role lives in the Firebase ID token's custom claims (``role``), not in
    a database column — see ``require_admin_user`` for the same pattern. Grant it
    with the Firebase Admin SDK:

        auth.set_custom_user_claims(uid, {"role": "champion"})

    Custom claims only take effect on the user's *next* ID token refresh (up to
    an hour on the client, or immediately if they sign in again) — not
    retroactively on tokens already issued.

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
