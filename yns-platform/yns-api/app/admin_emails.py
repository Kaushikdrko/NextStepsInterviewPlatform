"""The allowlist of email addresses that may use the Champion Dashboard.

This file is the *only* way to grant Champion (admin) access. Sign-up always
creates a plain student account — see ``routers/auth_otp.py``, which never sets
a role — so nobody can register themselves as a champion.

To grant access, add the person's email below and redeploy the API. The address
must be the one they sign in with. To revoke it, remove the line: the check runs
on every request, so access ends as soon as the new revision is live.

Comparison ignores surrounding whitespace and letter case, so ``User@Example.com``
here matches a token issued for ``user@example.com``.
"""

ADMIN_EMAILS: list[str] = [
    # Add one authorized Champion email per line, in quotes, ending with a comma.
    "afeefsemail@gmail.com",
    "Kaushik13.shivakumar@gmail.com",
    "sobhiralakarthik@gmail.com",
]


def normalize_email(email: str | None) -> str:
    return email.strip().lower() if email else ""


def is_admin_email(email: str | None) -> bool:
    """Whether ``email`` is authorized for Champion access.

    The single place any Champion email comparison happens. Callers must pass an
    email that came from a verified token, never one supplied by the client.
    """
    normalized = normalize_email(email)

    if not normalized:
        return False

    return any(normalized == normalize_email(allowed) for allowed in ADMIN_EMAILS)
