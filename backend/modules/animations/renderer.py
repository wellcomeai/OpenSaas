"""Рендер: Playwright покадрово снимает PNG, ffmpeg склеивает в mp4.

Детерминированная покадровая отрисовка: для каждого кадра вызываем
window.renderFrame(t) и делаем скриншот — экран НЕ записывается.
"""
from __future__ import annotations

import asyncio
import logging
import shutil
from pathlib import Path
from typing import Awaitable, Callable

logger = logging.getLogger("animations.renderer")

# Флаги Chromium для контейнера: без sandbox, без /dev/shm, без GPU.
CHROMIUM_ARGS = [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
]

# Разрешённые схемы для запросов страницы (всё остальное блокируем).
_ALLOWED_SCHEMES = ("file:", "data:", "about:", "blob:")

ProgressCb = Callable[[float], Awaitable[None]]


class RenderError(RuntimeError):
    """Ошибка на этапе рендера/энкодинга."""


async def capture_frames(
    *,
    html: str,
    job_dir: Path,
    fps: int,
    duration: int,
    width: int,
    height: int,
    on_progress: ProgressCb | None = None,
) -> tuple[Path, int]:
    """Снимает кадры PNG в {job_dir}/frames. Возвращает (frames_dir, total)."""
    # Импорт внутри функции: playwright нужен только на рендере.
    from playwright.async_api import async_playwright

    job_dir.mkdir(parents=True, exist_ok=True)
    frames_dir = job_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    index_path = job_dir / "index.html"
    index_path.write_text(html, encoding="utf-8")

    page_errors: list[str] = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True, args=CHROMIUM_ARGS)
        try:
            page = await browser.new_page(
                viewport={"width": width, "height": height},
                device_scale_factor=1,
            )
            page.on("pageerror", lambda exc: page_errors.append(str(exc)))

            # Блокировка сети: разрешаем только локальные схемы (защита от
            # SSRF и зависаний на внешних ресурсах).
            async def _route(route):  # type: ignore[no-untyped-def]
                url = route.request.url
                if url.startswith(_ALLOWED_SCHEMES):
                    await route.continue_()
                else:
                    await route.abort()

            await page.route("**/*", _route)

            await page.goto(index_path.as_uri(), wait_until="load")
            # Шрифты + наличие renderFrame.
            await page.evaluate(
                "async () => { if (document.fonts && document.fonts.ready) "
                "{ await document.fonts.ready; } }"
            )
            has_fn = await page.evaluate(
                "() => typeof window.renderFrame === 'function'"
            )
            if not has_fn:
                raise RenderError("window.renderFrame is not defined on the page")
            if page_errors:
                raise RenderError(f"Page error on load: {page_errors[0]}")

            total = int(round(fps * duration))
            total = max(total, 1)
            for i in range(total):
                t = i / fps
                await page.evaluate("(t) => window.renderFrame(t)", t)
                await page.screenshot(
                    path=str(frames_dir / f"frame_{i:05d}.png")
                )
                if page_errors:
                    raise RenderError(
                        f"Page error during render at frame {i}: {page_errors[0]}"
                    )
                if on_progress is not None:
                    await on_progress((i + 1) / total)
            return frames_dir, total
        finally:
            await browser.close()


async def encode_video(
    *, frames_dir: Path, output_path: Path, fps: int
) -> None:
    """Склейка PNG-кадров в mp4 через ffmpeg."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg",
        "-y",
        "-framerate",
        str(fps),
        "-i",
        str(frames_dir / "frame_%05d.png"),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",  # обязательно — иначе не откроется в части плееров/Телеге
        "-crf",
        "18",
        "-movflags",
        "+faststart",  # быстрый старт в браузере
        str(output_path),
    ]
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
    except FileNotFoundError as exc:
        raise RenderError("ffmpeg binary not found on the system") from exc

    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        tail = (stderr or b"").decode("utf-8", "replace")[-2000:]
        raise RenderError(f"ffmpeg failed (code {proc.returncode}): {tail}")


def cleanup_frames(frames_dir: Path) -> None:
    """Удаляет тяжёлую папку с кадрами. Безопасно при отсутствии."""
    try:
        if frames_dir.exists():
            shutil.rmtree(frames_dir, ignore_errors=True)
    except Exception:  # noqa: BLE001
        logger.warning("Failed to cleanup frames dir %s", frames_dir, exc_info=True)
