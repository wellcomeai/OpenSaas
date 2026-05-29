"""Генерация самодостаточного HTML-анимации через OpenRouter.

Переиспользует низкоуровневый клиент codeai.openrouter.chat_completion
(тот же системный OPENROUTER_API_KEY, заголовки HTTP-Referer / X-Title).
"""
from __future__ import annotations

import logging
import re

from config import settings
from modules.animations.prompts import RETRY_HINT, build_system_prompt
from modules.codeai import openrouter as base_openrouter

logger = logging.getLogger("animations.openrouter")


class AnimationGenerationError(RuntimeError):
    """Не удалось сгенерировать валидный HTML."""


_FENCE_RE = re.compile(r"^\s*```(?:html)?\s*|\s*```\s*$", re.IGNORECASE)

# Запрещённые внешние ресурсы (страница рендерится офлайн).
_EXTERNAL_PATTERNS = (
    re.compile(r"<script[^>]*\bsrc\s*=", re.IGNORECASE),
    re.compile(r"<link[^>]*\bhref\s*=", re.IGNORECASE),
    re.compile(r"<img[^>]*\bsrc\s*=\s*[\"']https?:", re.IGNORECASE),
    re.compile(r"url\(\s*[\"']?https?:", re.IGNORECASE),
    re.compile(r"@import\b", re.IGNORECASE),
)


def strip_markdown_fences(text: str) -> str:
    """Убирает ```html ... ``` ограждения, если модель их добавила."""
    text = text.strip()
    if text.startswith("```"):
        # отрезаем первую и последнюю строки-ограждения
        lines = text.splitlines()
        if lines and lines[0].lstrip().startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines)
    return text.strip()


def validate_html(html: str) -> str | None:
    """Возвращает текст ошибки или None если HTML валиден."""
    if not html or len(html) < 50:
        return "Generated HTML is empty or too short"
    if "renderFrame" not in html:
        return "HTML does not define renderFrame()"
    if not re.search(r"(window\.)?renderFrame\s*=|function\s+renderFrame", html):
        return "HTML does not define window.renderFrame / function renderFrame"
    for pattern in _EXTERNAL_PATTERNS:
        if pattern.search(html):
            return f"HTML references an external resource ({pattern.pattern})"
    return None


async def generate_animation_html(
    *, prompt: str, duration: int, width: int, height: int
) -> str:
    """Генерирует валидный HTML. Один авто-ретрай при провале валидации.

    Бросает AnimationGenerationError если после ретрая HTML всё ещё невалиден
    или OpenRouter недоступен.
    """
    model = settings.animations_model
    system_prompt = build_system_prompt(
        prompt=prompt, duration=duration, width=width, height=height
    )
    messages: list[dict[str, str]] = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt},
    ]

    last_error = ""
    for attempt in range(2):
        try:
            raw = await base_openrouter.chat_completion(
                model,
                messages,
                temperature=0.3,
                max_tokens=16000,
            )
        except Exception as exc:  # noqa: BLE001
            # Сетевые / API ошибки OpenRouter — не падаем молча.
            raise AnimationGenerationError(
                f"OpenRouter request failed: {exc}"
            ) from exc

        html = strip_markdown_fences(raw)
        error = validate_html(html)
        if error is None:
            return html

        last_error = error
        logger.warning(
            "Animation HTML validation failed (attempt %d): %s", attempt + 1, error
        )
        # Готовим ретрай: добавляем ответ модели и уточняющее сообщение.
        messages.append({"role": "assistant", "content": raw})
        messages.append({"role": "user", "content": RETRY_HINT})

    raise AnimationGenerationError(
        f"LLM did not return valid animation HTML: {last_error}"
    )
