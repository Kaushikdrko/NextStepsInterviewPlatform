import time
from typing import Any

from anthropic import Anthropic

from app.config import settings

_client: Anthropic | None = None


def get_anthropic_client() -> Anthropic:
    global _client
    if _client is None:
        _client = Anthropic(api_key=settings.anthropic_api_key)
    return _client


def call_claude(
    messages: list[dict[str, Any]],
    system: str,
    tools: list[dict[str, Any]] | None = None,
    model: str = "claude-haiku-4-5",
    use_cache: bool = True,
) -> Any:
    if use_cache:
        system_block = [{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}]
    else:
        system_block = [{"type": "text", "text": system}]

    kwargs: dict[str, Any] = {
        "model": model,
        "max_tokens": 2048,
        "system": system_block,
        "messages": messages,
    }
    if tools:
        kwargs["tools"] = tools
        kwargs["tool_choice"] = {"type": "any"}

    client = get_anthropic_client()

    for attempt in range(2):
        start = time.monotonic()
        try:
            response = client.messages.create(**kwargs)
            break
        except Exception as exc:
            if attempt == 1:
                raise
            kwargs["messages"] = kwargs["messages"] + [
                {
                    "role": "user",
                    "content": f"Your previous response failed validation: {exc}. Please try again.",
                }
            ]

    latency_ms = int((time.monotonic() - start) * 1000)
    print(
        f"[claude] model={model} in={response.usage.input_tokens} "
        f"cache_read={response.usage.cache_read_input_tokens or 0} "
        f"out={response.usage.output_tokens} latency={latency_ms}ms"
    )

    for block in response.content:
        if block.type == "tool_use":
            return block.input
    return {"text": response.content[0].text}
