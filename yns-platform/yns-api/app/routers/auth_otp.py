import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from firebase_admin import auth as firebase_auth
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_firebase_app
from app.models import SignupOtpCode
from app.schemas.auth_otp import (
    OtpStartRequest,
    OtpStartResponse,
    OtpVerifyRequest,
    OtpVerifyResponse,
)
from app.services.otp_email import send_otp_email

router = APIRouter(prefix="/auth/otp", tags=["auth"])

_CODE_TTL = timedelta(minutes=10)
_RESEND_COOLDOWN = timedelta(seconds=30)
_MAX_ATTEMPTS = 5


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


@router.post("/start", response_model=OtpStartResponse)
def start_otp(body: OtpStartRequest, db: Session = Depends(get_db)) -> OtpStartResponse:
    email = body.email.lower()

    try:
        firebase_auth.get_user_by_email(email, app=get_firebase_app())
        return OtpStartResponse(success=False, error="An account with this email already exists.")
    except firebase_auth.UserNotFoundError:
        pass

    now = datetime.now(timezone.utc)
    existing = (
        db.query(SignupOtpCode)
        .filter(SignupOtpCode.email == email)
        .order_by(SignupOtpCode.created_at.desc())
        .first()
    )
    if existing and (now - existing.created_at) < _RESEND_COOLDOWN:
        return OtpStartResponse(success=False, error="Please wait a moment before requesting another code.")

    db.query(SignupOtpCode).filter(SignupOtpCode.email == email).delete()

    code = f"{secrets.randbelow(1_000_000):06d}"
    db.add(
        SignupOtpCode(
            email=email,
            code_hash=_hash_code(code),
            attempts=0,
            expires_at=now + _CODE_TTL,
            created_at=now,
        )
    )
    db.commit()

    try:
        send_otp_email(email, code)
    except Exception as exc:
        return OtpStartResponse(success=False, error=f"Could not send verification email: {exc}")

    return OtpStartResponse(success=True)


@router.post("/verify", response_model=OtpVerifyResponse)
def verify_otp(body: OtpVerifyRequest, db: Session = Depends(get_db)) -> OtpVerifyResponse:
    email = body.email.lower()
    now = datetime.now(timezone.utc)

    record = (
        db.query(SignupOtpCode)
        .filter(SignupOtpCode.email == email)
        .order_by(SignupOtpCode.created_at.desc())
        .first()
    )

    if record is None or record.expires_at < now:
        return OtpVerifyResponse(success=False, error="Code expired or not found. Request a new one.")

    if record.attempts >= _MAX_ATTEMPTS:
        db.delete(record)
        db.commit()
        return OtpVerifyResponse(success=False, error="Too many incorrect attempts. Request a new code.")

    if record.code_hash != _hash_code(body.code):
        record.attempts += 1
        db.commit()
        return OtpVerifyResponse(success=False, error="Incorrect code.")

    db.delete(record)
    db.commit()

    try:
        user = firebase_auth.create_user(
            uid=str(uuid.uuid4()),
            email=email,
            password=body.password,
            email_verified=True,
            app=get_firebase_app(),
        )
    except firebase_auth.EmailAlreadyExistsError:
        return OtpVerifyResponse(success=False, error="An account with this email already exists.")

    custom_token = firebase_auth.create_custom_token(user.uid, app=get_firebase_app())
    return OtpVerifyResponse(success=True, custom_token=custom_token.decode("utf-8"))
