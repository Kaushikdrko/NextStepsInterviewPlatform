import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "")
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    gcp_project_id: str = os.getenv("GCP_PROJECT_ID", "yns-interview-staging")
    gcp_location: str = os.getenv("GCP_LOCATION", "us-central1")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    resend_api_key: str = os.getenv("RESEND_API_KEY", "")
    otp_from_email: str = os.getenv("OTP_FROM_EMAIL", "YNS <onboarding@resend.dev>")
    voice_bucket: str = os.getenv("VOICE_BUCKET", "")

    @property
    def cors_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.frontend_url.split(",") if origin.strip()]
        if any("localhost" in origin or "127.0.0.1" in origin for origin in origins):
            origins.extend(
                [
                    "http://localhost:3000",
                    "http://127.0.0.1:3000",
                    "http://localhost:3001",
                    "http://127.0.0.1:3001",
                ]
            )

        return sorted(set(origins)) or ["http://localhost:3000", "http://127.0.0.1:3000"]


settings = Settings()
