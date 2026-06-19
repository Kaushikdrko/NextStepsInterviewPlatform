from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings
from app.routers import (
    career_profiles,
    high_school_profiles,
    job_postings,
    onboarding_summary,
    resumes,
    user_skills,
    users,
)

app = FastAPI(title="YNS API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(_request: Request, _exception: SQLAlchemyError):
    return JSONResponse(
        status_code=500,
        content={"detail": "A database error occurred while processing the request."},
    )


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "YNS API is running"}


app.include_router(users.router, prefix="/api")
app.include_router(career_profiles.router, prefix="/api")
app.include_router(high_school_profiles.router, prefix="/api")
app.include_router(user_skills.router, prefix="/api")
app.include_router(resumes.router, prefix="/api")
app.include_router(job_postings.router, prefix="/api")

# The onboarding summary endpoint returns a single AI-ready context object for
# the interview generator, so AI code does not need to query individual tables.
app.include_router(onboarding_summary.router, prefix="/api")
