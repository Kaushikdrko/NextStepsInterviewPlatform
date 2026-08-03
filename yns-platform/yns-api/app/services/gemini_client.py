import time
from typing import Any

from google import genai
from google.genai import types
from pydantic import BaseModel

from app.config import settings

_client: genai.Client | None = None


def get_genai_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(
            vertexai=True,
            project=settings.gcp_project_id,
            location=settings.gcp_location,
        )
    return _client


def call_gemini(
    contents: list[types.Part | str] | str,
    system: str,
    model: str = settings.gemini_model,
    response_model: type[BaseModel] | None = None,
) -> Any:
    config_kwargs: dict[str, Any] = {"system_instruction": system}
    if response_model is not None:
        config_kwargs["response_mime_type"] = "application/json"
        config_kwargs["response_schema"] = response_model

    client = get_genai_client()
    contents_list: list[Any] = contents if isinstance(contents, list) else [contents]

    for attempt in range(2):
        start = time.monotonic()
        try:
            response = client.models.generate_content(
                model=model,
                contents=contents_list,
                config=types.GenerateContentConfig(**config_kwargs),
            )
            if response_model is not None:
                result = response.parsed.model_dump() if response.parsed else None
                if result is None:
                    raise ValueError("Gemini response did not match the requested schema")
            else:
                result = {"text": response.text}
            break
        except Exception as exc:
            if attempt == 1:
                raise
            contents_list = contents_list + [
                f"Your previous response failed validation: {exc}. Please try again."
            ]

    latency_ms = int((time.monotonic() - start) * 1000)
    usage = response.usage_metadata
    print(
        f"[gemini] model={model} in={usage.prompt_token_count} "
        f"cached={usage.cached_content_token_count or 0} "
        f"out={usage.candidates_token_count} latency={latency_ms}ms"
    )

    return result
