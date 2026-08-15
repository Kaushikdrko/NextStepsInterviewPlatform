from supabase import Client, create_client

from app.config import settings

"""Supabase access is now Storage-only (the `resumes` bucket) — see
app/services/session_store.py for interview_sessions/interview_turns/
session_reports, which moved to Cloud SQL, and app/services/profile_store.py
for the rest of the onboarding domain (also Cloud SQL).
"""

_client: Client | None = None


def get_supabase_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client
