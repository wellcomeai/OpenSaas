"""System prompt для генерации HTML-анимации через LLM."""
from __future__ import annotations

from modules.animations.config import resolve_style_hint

SYSTEM_PROMPT = """You are an expert motion-graphics engineer. You output ONE self-contained HTML
document that renders a frame-based animation. STRICT CONTRACT:

1. Define a global function window.renderFrame(t), where t is time in SECONDS (float),
   ranging from 0 to {DURATION}. Calling renderFrame(t) must fully set the visual
   state for time t.
2. renderFrame(t) MUST be a PURE function of t: same t => same pixels. Do NOT use
   requestAnimationFrame, setInterval, CSS animations/transitions, Date.now(),
   performance.now(), or unseeded Math.random(). All motion is computed from t.
3. The stage is exactly {WIDTH}x{HEIGHT} px. Nothing overflows the stage.
4. FULLY OFFLINE: inline all CSS/JS/SVG. No external fonts, images, scripts, or CDNs.
   Use system fonts and inline SVG/CSS graphics only.
5. Solid background (unless asked otherwise). Call renderFrame(0) once on load.
6. Make it visually polished: smooth easing (write your own easing helpers like
   easeInOutCubic), good typography, tasteful timing for {DURATION} seconds.
{STYLE_HINT}
Output ONLY the HTML document. No explanation, no markdown fences.
The user's animation request (may be in any language): {USER_PROMPT}"""


# Уточняющее сообщение для авто-ретрая, если первая генерация не прошла валидацию.
RETRY_HINT = (
    "Your previous output was INVALID. It must be a single self-contained HTML "
    "document that defines window.renderFrame(t) (a pure function of t) and contains "
    "NO external resources (no <script src=...>, no <link href=...>, no remote images). "
    "Output ONLY the corrected HTML document, no markdown fences, no explanation."
)


def build_system_prompt(
    *, prompt: str, duration: int, width: int, height: int, style: str = "auto"
) -> str:
    hint = resolve_style_hint(style)
    # Стиль подмешиваем отдельным пунктом контракта только если он задан.
    style_line = f"7. {hint}\n" if hint else ""
    return SYSTEM_PROMPT.format(
        DURATION=duration,
        WIDTH=width,
        HEIGHT=height,
        STYLE_HINT=style_line,
        USER_PROMPT=prompt,
    )
