"""Выбор сцены B-roll через OpenRouter.

LLM по тексту выбирает сцену из реестра и параметры. Ответу LLM нельзя
доверять: он ВСЕГДА валидируется через Pydantic. Невалидный ответ →
один повтор → фоллбэк на calm_gradient. Функция никогда не пробрасывает
исключение наверх.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any

from pydantic import ValidationError

from modules.codeai import openrouter
from modules.broll.scenes import SCENES
from modules.broll.schemas import SceneKey, SceneParams

logger = logging.getLogger("broll.llm")

MODEL = "deepseek/deepseek-chat"

_FALLBACK = SceneParams(
    scene=SceneKey.CALM_GRADIENT,
    color_from="#0a1f3c",
    color_to="#0066ff",
    speed=0.3,
    duration=5,
)


def _build_system_prompt() -> str:
    lines = [
        "Ты — режиссёр коротких фоновых анимаций (B-roll).",
        "По тексту пользователя выбери ОДНУ визуальную сцену из реестра",
        "и подбери параметры. Доступные сцены:",
        "",
    ]
    for key, meta in SCENES.items():
        themes = ", ".join(meta["themes"])
        lines.append(f'- "{key.value}": {meta["description"]} Темы: {themes}.')
    lines += [
        "",
        "Верни СТРОГО JSON без markdown, без пояснений, по схеме:",
        "{",
        '  "scene": "<один из ключей сцены выше>",',
        '  "color_from": "#RRGGBB",',
        '  "color_to": "#RRGGBB",',
        '  "speed": <число от 0.1 до 0.5>,',
        '  "duration": <целое от 3 до 5>',
        "}",
        "",
        "color_from — тёмный фоновый цвет, color_to — яркий акцент,",
        "подходящие по смыслу текста. Только корректный hex (#RRGGBB).",
    ]
    return "\n".join(lines)


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


async def _attempt(messages: list[dict[str, Any]]) -> SceneParams:
    raw = await openrouter.chat_completion(
        MODEL,
        messages,
        temperature=0.3,
        response_format={"type": "json_object"},
    )
    return SceneParams.model_validate(_extract_json(raw))


async def choose_scene(prompt: str) -> SceneParams:
    """Возвращает валидный SceneParams. Никогда не бросает исключение."""
    messages = [
        {"role": "system", "content": _build_system_prompt()},
        {"role": "user", "content": prompt},
    ]

    for attempt in range(2):
        try:
            return await _attempt(messages)
        except (ValidationError, json.JSONDecodeError, ValueError) as e:
            logger.warning("choose_scene attempt %d invalid: %s", attempt + 1, e)
        except Exception as e:  # noqa: BLE001
            logger.warning("choose_scene attempt %d failed: %s", attempt + 1, e)

    logger.warning("choose_scene falling back to calm_gradient for prompt: %r", prompt)
    return _FALLBACK.model_copy(deep=True)
