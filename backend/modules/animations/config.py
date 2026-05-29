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


def resolve_resolution(aspect: str) -> tuple[int, int]:
    """Маппинг aspect-строки в (width, height). Дефолт — 9:16."""
    return ASPECT_RESOLUTIONS.get(aspect, ASPECT_RESOLUTIONS["9:16"])
