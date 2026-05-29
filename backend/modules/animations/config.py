"""Константы модуля animations: разрешения, лимиты, маппинг aspect → размер."""
from __future__ import annotations

# aspect → (width, height)
ASPECT_RESOLUTIONS: dict[str, tuple[int, int]] = {
    "9:16": (1080, 1920),  # Reels / Shorts
    "1:1": (1080, 1080),
    "16:9": (1920, 1080),
}

ALLOWED_ASPECTS = tuple(ASPECT_RESOLUTIONS.keys())
ALLOWED_FPS = (24, 30)

MAX_PROMPT_LENGTH = 2000
DEFAULT_DURATION = 6

# Пресеты стилей B-roll: id → доп. указание для system prompt.
# "auto" — без доп. указаний (поведение как раньше). Остальные задают
# визуальное направление короткой фоновой вставки.
BROLL_STYLES: dict[str, str] = {
    "auto": "",
    "gradient": "Style: smooth animated gradient mesh background with soft color drift; minimal, elegant.",
    "kinetic_text": "Style: kinetic typography — animate the key phrase in and out with smooth easing; bold modern type.",
    "particles": "Style: deterministic particle field / floating geometric shapes with parallax depth; subtle motion.",
    "geometric": "Style: minimal flat geometric shapes that morph and translate cleanly; tasteful color palette.",
    "dataviz": "Style: abstract animated data visualization (bars / lines / counters) with a clean tech/analytics vibe.",
}

ALLOWED_STYLES = tuple(BROLL_STYLES.keys())
DEFAULT_STYLE = "auto"


def resolve_resolution(aspect: str) -> tuple[int, int]:
    """Маппинг aspect-строки в (width, height). Дефолт — 9:16."""
    return ASPECT_RESOLUTIONS.get(aspect, ASPECT_RESOLUTIONS["9:16"])


def resolve_style_hint(style: str) -> str:
    """Доп. указание для промпта по id стиля. Неизвестный стиль → пусто."""
    return BROLL_STYLES.get(style, "")
