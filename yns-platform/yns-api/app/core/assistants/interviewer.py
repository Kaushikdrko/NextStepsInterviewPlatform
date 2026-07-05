import json
from typing import Literal

from pydantic import BaseModel

from app.core.prompts.interviewer_prompt import INTERVIEWER_SYSTEM, build_interviewer_prompt
from app.services.anthropic_client import call_claude


class InterviewerResponse(BaseModel):
    action: Literal["ACKNOWLEDGE_AND_ADVANCE", "PROBE", "REDIRECT"]
    response_text: str


def get_interviewer_response(
    current_question: str,
    answer: str,
    recent_turns: list[dict],
) -> InterviewerResponse:
    prompt = build_interviewer_prompt(current_question, answer, recent_turns)

    raw = call_claude(
        messages=[{"role": "user", "content": prompt}],
        system=INTERVIEWER_SYSTEM,
    )

    parsed = json.loads(raw["text"])
    return InterviewerResponse(**parsed)
