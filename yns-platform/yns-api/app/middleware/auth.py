import ssl

import certifi
import jwt
from fastapi import HTTPException

from app.config import settings

_jwks_client: jwt.PyJWKClient | None = None


def _get_jwks_client() -> jwt.PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        _jwks_client = jwt.PyJWKClient(jwks_url, ssl_context=ssl_context)
    return _jwks_client


def verify_supabase_jwt(token: str) -> dict:
    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            options={"verify_aud": False},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc


def get_user_id_from_token(token: str) -> str:
    payload = verify_supabase_jwt(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id
