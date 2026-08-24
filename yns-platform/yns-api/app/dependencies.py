from typing import Any

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.admin_emails import is_admin_email
from app.middleware.auth import verify_firebase_token

security = HTTPBearer(auto_error=False)


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


def claims_email(claims: dict[str, Any]) -> str | None:
    """The signed-in user's email, taken from the verified token only."""
    email = claims.get("email")
    if isinstance(email, str):
        return email

    # Identity Platform users migrated from Supabase can still carry the email
    # under the old nested shape — the same fallback the champion profile uses.
    user_metadata = claims.get("user_metadata")
    if isinstance(user_metadata, dict) and isinstance(user_metadata.get("email"), str):
        return user_metadata["email"]

    return None


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

    Access is granted by email address, from the allowlist in
    ``app/admin_emails.py``. The address comes out of the verified ID token, so a
    caller cannot authorize themselves by sending someone else's email, and a
    token carrying no email is never authorized.

    Being on the allowlist does not take the student experience away: the same
    account can use either dashboard, and which one it lands on is the login mode
    the user picked, not something stored against the account.

    Champions are not scoped to individual students: every authorized champion
    sees the same organization-wide data, so this returns only the caller's id
    for logging/profile lookups and never filters query results by it.
    """
    if not is_admin_email(claims_email(claims)):
        raise HTTPException(status_code=403, detail="Champion access required")

    return _claims_subject(claims)


def require_user_ownership(user_id: str, current_user_id: str) -> None:
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this user's data")
