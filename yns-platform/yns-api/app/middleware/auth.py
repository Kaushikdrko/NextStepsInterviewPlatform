import logging

import firebase_admin
from fastapi import HTTPException
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

from app.config import settings

logger = logging.getLogger(__name__)

_firebase_app: firebase_admin.App | None = None


def get_firebase_app() -> firebase_admin.App:
    global _firebase_app
    if _firebase_app is None:
        _firebase_app = firebase_admin.initialize_app(
            credentials.ApplicationDefault(),
            {"projectId": settings.gcp_project_id},
        )
    return _firebase_app


def verify_firebase_token(token: str) -> dict:
    try:
        return firebase_auth.verify_id_token(
            token, app=get_firebase_app(), check_revoked=True
        )
    except Exception as exc:
        # Deliberately returns a generic 401 to the client either way (don't
        # leak whether this was a bad token vs. a server-side permission/
        # config problem) — but log the real cause, or an IAM gap like the
        # one hit in Phase 4 verification looks identical to an expired
        # token and is very hard to find without this.
        logger.warning("Firebase token verification failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc
