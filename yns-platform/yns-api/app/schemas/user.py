from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr

UserType = Literal[
    "high_school",
    "high_school_student",
    "college",
    "college_student",
    "recent_grad",
    "recent_graduate",
]


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    name: str | None = None
    user_type: UserType
    created_at: datetime | None = None
    updated_at: datetime | None = None
