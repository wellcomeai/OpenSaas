"""OpenRouter клиент: список моделей, chat completion, embeddings.

Всегда использует системный OPENROUTER_API_KEY из env.
"""
from __future__ import annotations

import logging
from typing import Any, Iterable

import httpx

from config import settings

logger = logging.getLogger("codeai.openrouter")

OPENROUTER_BASE = "https://openrouter.ai/api/v1"
MIN_CONTEXT_LENGTH = 16000


def _headers() -> dict[str, str]:
    if not settings.openrouter_api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not configured")
    return {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "HTTP-Referer": settings.app_url,
        "X-Title": settings.app_name,
        "Content-Type": "application/json",
    }


async def get_available_models() -> list[dict[str, Any]]:
    """Список моделей с context_length >= MIN_CONTEXT_LENGTH."""
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{OPENROUTER_BASE}/models", headers=_headers())
        r.raise_for_status()
        raw = r.json().get("data", [])

    out: list[dict[str, Any]] = []
    for m in raw:
        ctx = int(m.get("context_length") or 0)
        if ctx < MIN_CONTEXT_LENGTH:
            continue
        pricing = m.get("pricing") or {}
        out.append(
            {
                "id": m.get("id"),
                "name": m.get("name") or m.get("id"),
                "description": m.get("description"),
                "context_length": ctx,
                "pricing": {
                    "prompt": str(pricing.get("prompt") or "0"),
                    "completion": str(pricing.get("completion") or "0"),
                },
            }
        )
    return out


async def chat_completion(
    model_id: str,
    messages: list[dict[str, Any]],
    *,
    temperature: float = 0.2,
    max_tokens: int | None = None,
    response_format: dict[str, Any] | None = None,
) -> str:
    """Однократный chat completion. Возвращает content первой ассистент-реплики."""
    payload: dict[str, Any] = {
        "model": model_id,
        "messages": messages,
        "temperature": temperature,
    }
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens
    if response_format is not None:
        payload["response_format"] = response_format

    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(
            f"{OPENROUTER_BASE}/chat/completions",
            headers=_headers(),
            json=payload,
        )
        r.raise_for_status()
        data = r.json()
    choices = data.get("choices") or []
    if not choices:
        raise RuntimeError(f"OpenRouter returned no choices: {data}")
    return choices[0]["message"]["content"] or ""


async def get_embedding(text: str, *, model: str | None = None) -> list[float]:
    """Embedding через OpenRouter (совместимый с OpenAI endpoint)."""
    model_id = model or settings.codeai_embeddings_model
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            f"{OPENROUTER_BASE}/embeddings",
            headers=_headers(),
            json={"model": model_id, "input": text},
        )
        r.raise_for_status()
        data = r.json()
    return data["data"][0]["embedding"]


async def get_embeddings_batch(
    texts: Iterable[str], *, model: str | None = None
) -> list[list[float]]:
    model_id = model or settings.codeai_embeddings_model
    payload_input = list(texts)
    if not payload_input:
        return []
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(
            f"{OPENROUTER_BASE}/embeddings",
            headers=_headers(),
            json={"model": model_id, "input": payload_input},
        )
        r.raise_for_status()
        data = r.json()
    return [item["embedding"] for item in data["data"]]
