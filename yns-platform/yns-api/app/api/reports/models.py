from pydantic import BaseModel

from app.core.schemas.report import SessionReport


class GenerateReportResponse(BaseModel):
    report: SessionReport
