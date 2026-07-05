import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "")
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")

    @property
    def cors_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.frontend_url.split(",") if origin.strip()]
        return origins or ["http://localhost:3000"]


settings = Settings()
