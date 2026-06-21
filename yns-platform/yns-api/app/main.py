"""FastAPI application entrypoint for the YNS platform API.

Run locally with:

    uvicorn app.main:app --reload --port 8000

For now only the Champion (Admin) Dashboard routes are wired in and they serve
hardcoded data. Other feature routers (sessions, reports, resume) can be added
here as they are implemented.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin import router as admin_router

app = FastAPI(
    title="Your Next Steps-US API",
    description="Backend for the AI-powered mock interview platform.",
    version="0.1.0",
)

# Allow the Next.js dev server to call the API during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_router)


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
