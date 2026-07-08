from pydantic import BaseModel


class ParseResumeResponse(BaseModel):
    success: bool
    message: str
