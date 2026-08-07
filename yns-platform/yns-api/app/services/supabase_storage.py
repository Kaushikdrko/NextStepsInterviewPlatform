from supabase import Client, create_client

from app.config import settings

_client: Client | None = None


def get_supabase_storage_client() -> Client:
    """Return the legacy resume-file storage client.

    Relational application data lives in Cloud SQL. This client is limited to
    resume file bytes until that bucket is moved to Google Cloud Storage.
    """
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client
