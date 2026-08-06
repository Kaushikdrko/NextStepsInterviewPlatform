from pydantic import BaseModel, EmailStr, Field


class OtpStartRequest(BaseModel):
    email: EmailStr


class OtpStartResponse(BaseModel):
    success: bool
    error: str | None = None


class OtpVerifyRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    password: str = Field(min_length=6)


class OtpVerifyResponse(BaseModel):
    success: bool
    custom_token: str | None = None
    error: str | None = None
