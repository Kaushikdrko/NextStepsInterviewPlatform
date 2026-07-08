import json
import re
from typing import Literal

from pydantic import BaseModel, ValidationError

from app.core.prompts.interviewer_prompt import INTERVIEWER_SYSTEM, build_interviewer_prompt
from app.services.anthropic_client import call_claude

_CODE_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE | re.MULTILINE)


class InterviewerResponse(BaseModel):
    action: Literal["ACKNOWLEDGE_AND_ADVANCE", "PROBE", "REDIRECT"]
    response_text: str


def _strip_code_fence(text: str) -> str:
    return _CODE_FENCE_RE.sub("", text).strip()


def get_interviewer_response(
    current_question: str,
    answer: str,
    recent_turns: list[dict],
) -> InterviewerResponse:
    prompt = build_interviewer_prompt(current_question, answer, recent_turns)
    messages = [{"role": "user", "content": prompt}]

    for attempt in range(2):
        raw = call_claude(messages=messages, system=INTERVIEWER_SYSTEM)
        try:
            parsed = json.loads(_strip_code_fence(raw["text"]))
            return InterviewerResponse(**parsed)
        except (json.JSONDecodeError, ValidationError) as exc:
            if attempt == 1:
                raise
            messages = messages + [
                {
                    "role": "user",
                    "content": (
                        f"Your previous response failed to parse: {exc}. "
                        "Respond with exactly the JSON shape described above, "
                        "and nothing else — no markdown code fences, no extra text."
                    ),
                }
            ]
