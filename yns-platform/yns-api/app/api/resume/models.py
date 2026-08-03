from pydantic import BaseModel


class ParseResumeRequest(BaseModel):
    resume_id: str | None = None


class ParseResumeResponse(BaseModel):
    success: bool
    message: str
    resume_id: str | None = None
