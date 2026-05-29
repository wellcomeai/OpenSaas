"""OpenRouter клиент: список моделей, chat completion, embeddings.

Всегда использует системный OPENROUTER_API_KEY из env.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Iterable

import httpx

from config import settings

logger = logging.getLogger("codeai.openrouter")

OPENROUTER_BASE = "https://openrouter.ai/api/v1"
MIN_CONTEXT_LENGTH = 16000

# OpenRouter на долгих генерациях подмешивает SSE-style keep-alive строки
# вида ": OPENROUTER PROCESSING", чтобы соединение не таймаутилось. Для
# не-стриминговых ответов они ломают единый json.loads — срезаем их.
_KEEPALIVE_PREFIX = ":"


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


def _build_payload(
    model_id: str,
    messages: list[dict[str, Any]],
    *,
    temperature: float,
    max_tokens: int | None,
    response_format: dict[str, Any] | None,
    stream: bool = False,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "model": model_id,
        "messages": messages,
        "temperature": temperature,
    }
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens
    if response_format is not None:
        payload["response_format"] = response_format
    if stream:
        payload["stream"] = True
    return payload


def _extract_content(data: dict[str, Any]) -> str:
    """Достаёт content первой ассистент-реплики из ответа chat/completions."""
    choices = data.get("choices") or []
    if not choices:
        raise RuntimeError(f"OpenRouter returned no choices: {data}")
    return choices[0]["message"]["content"] or ""


def _strip_keepalive(body: str) -> str:
    """Убирает keep-alive комментарии (': OPENROUTER PROCESSING') и пустые
    строки, которые OpenRouter может подмешать в не-стриминговый ответ."""
    lines = [
        ln
        for ln in body.splitlines()
        if ln.strip() and not ln.lstrip().startswith(_KEEPALIVE_PREFIX)
    ]
    return "\n".join(lines).strip()


def _parse_json_body(body: str, *, status_code: int, content_type: str) -> dict[str, Any]:
    """Безопасный разбор тела ответа в JSON.

    На грязном теле (keep-alive строки, обрыв) логирует диагностику и
    бросает понятный RuntimeError вместо голого JSONDecodeError.
    """
    try:
        return json.loads(body)
    except json.JSONDecodeError:
        cleaned = _strip_keepalive(body)
        if cleaned and cleaned != body:
            try:
                return json.loads(cleaned)
            except json.JSONDecodeError:
                pass
        logger.error(
            "OpenRouter non-JSON body: status=%s, content_type=%s, len=%d, "
            "head=%r, tail=%r",
            status_code,
            content_type,
            len(body),
            body[:500],
            body[-500:],
        )
        raise RuntimeError(
            f"OpenRouter returned a non-JSON / truncated body "
            f"(HTTP {status_code}, content_type={content_type!r}, "
            f"len={len(body)}): {body[:300]!r}"
        ) from None


async def chat_completion(
    model_id: str,
    messages: list[dict[str, Any]],
    *,
    temperature: float = 0.2,
    max_tokens: int | None = None,
    response_format: dict[str, Any] | None = None,
    timeout: float = 120,
) -> str:
    """Однократный chat completion. Возвращает content первой ассистент-реплики."""
    payload = _build_payload(
        model_id,
        messages,
        temperature=temperature,
        max_tokens=max_tokens,
        response_format=response_format,
    )

    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(
            f"{OPENROUTER_BASE}/chat/completions",
            headers=_headers(),
            json=payload,
        )
        if r.is_error:
            # Прокидываем тело ответа: OpenRouter на 404/4xx пишет в нём
            # причину (например "No endpoints found for <model>"), иначе
            # raise_for_status проглатывает её и в логах остаётся голый код.
            raise RuntimeError(
                f"OpenRouter chat_completion failed "
                f"(HTTP {r.status_code}, model={model_id!r}): {r.text}"
            )
        data = _parse_json_body(
            r.text,
            status_code=r.status_code,
            content_type=r.headers.get("content-type", ""),
        )
    return _extract_content(data)


async def chat_completion_stream(
    model_id: str,
    messages: list[dict[str, Any]],
    *,
    temperature: float = 0.2,
    max_tokens: int | None = None,
    response_format: dict[str, Any] | None = None,
    timeout: float = 300,
) -> str:
    """Потоковый chat completion (stream:true). Накапливает delta.content и
    возвращает полную строку.

    Устойчив к keep-alive комментариям OpenRouter (строки, начинающиеся с
    ':') и к битым отдельным чанкам. Подходит для больших/медленных
    генераций, где единый json.loads по всему телу ненадёжен.
    """
    payload = _build_payload(
        model_id,
        messages,
        temperature=temperature,
        max_tokens=max_tokens,
        response_format=response_format,
        stream=True,
    )

    # read-timeout — основной для долгой генерации; connect/write короче.
    timeouts = httpx.Timeout(connect=15.0, read=timeout, write=30.0, pool=15.0)
    parts: list[str] = []

    async with httpx.AsyncClient(timeout=timeouts) as client:
        async with client.stream(
            "POST",
            f"{OPENROUTER_BASE}/chat/completions",
            headers=_headers(),
            json=payload,
        ) as resp:
            if resp.is_error:
                body = (await resp.aread()).decode(errors="replace")
                raise RuntimeError(
                    f"OpenRouter chat_completion (stream) failed "
                    f"(HTTP {resp.status_code}, model={model_id!r}): {body}"
                )

            async for line in resp.aiter_lines():
                if not line or line.startswith(_KEEPALIVE_PREFIX):
                    # пустая строка или keep-alive комментарий — пропускаем
                    continue
                if not line.startswith("data:"):
                    continue
                data_str = line[len("data:"):].strip()
                if data_str == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_str)
                except json.JSONDecodeError:
                    logger.warning("OpenRouter: skipping malformed SSE chunk: %r", data_str[:200])
                    continue
                if chunk.get("error"):
                    raise RuntimeError(f"OpenRouter stream error: {chunk['error']}")
                for choice in chunk.get("choices") or []:
                    delta = choice.get("delta") or {}
                    content = delta.get("content")
                    if content:
                        parts.append(content)

    return "".join(parts)


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
