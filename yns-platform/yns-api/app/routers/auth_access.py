"""Champion authorization lookup for the login page.

The browser cannot decide whether someone is a champion — the allowlist stays on
the server and is never sent to the client. This endpoint answers that single
question for the caller's *own* verified token, so it can neither be used to
probe another account nor to discover who is on the list.

It is a convenience for routing after login. The security boundary is
``require_champion_user`` on every ``/api/champion/*`` route.
"""

from typing import Any

from fastapi import APIRouter, Depends

from app.admin_emails import is_admin_email
from app.dependencies import claims_email, get_current_claims
from app.schemas.auth_access import ChampionAccessResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/champion-access", response_model=ChampionAccessResponse)
def get_champion_access(
    claims: dict[str, Any] = Depends(get_current_claims),
) -> ChampionAccessResponse:
    return ChampionAccessResponse(authorized=is_admin_email(claims_email(claims)))
