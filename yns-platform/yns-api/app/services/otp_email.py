import resend

from app.config import settings


def send_otp_email(email: str, code: str) -> None:
    resend.api_key = settings.resend_api_key
    resend.Emails.send(
        {
            "from": settings.otp_from_email,
            "to": [email],
            "subject": "Your YNS verification code",
            "html": (
                f"<p>Your verification code is <strong>{code}</strong>.</p>"
                "<p>This code expires in 10 minutes. If you didn't request this, "
                "you can safely ignore this email.</p>"
            ),
        }
    )
