"""Асинхронный запуск ffmpeg для рендера B-roll.

ffmpeg запускается как отдельный ОС-процесс через
asyncio.create_subprocess_exec со списком аргументов — НИКОГДА не
shell=True. Так event loop не блокируется.
"""
from __future__ import annotations

import asyncio
import logging
import os
from uuid import UUID

from config import settings
from modules.broll import scenes
from modules.broll.schemas import SceneParams

logger = logging.getLogger("broll.renderer")


async def render(params: SceneParams, job_id: UUID) -> str:
    """Рендерит сцену в {output_dir}/{job_id}.mp4, возвращает путь к файлу."""
    output_dir = settings.broll_output_dir
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{job_id}.mp4")

    cmd = scenes.build_command(params, output_path)
    logger.info("Rendering job %s scene=%s", job_id, params.scene.value)

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    try:
        _, stderr = await asyncio.wait_for(
            proc.communicate(), timeout=settings.broll_render_timeout
        )
    except asyncio.TimeoutError as exc:
        proc.kill()
        await proc.wait()
        raise RuntimeError(
            f"ffmpeg timed out after {settings.broll_render_timeout}s"
        ) from exc

    if proc.returncode != 0:
        err = (stderr or b"").decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"ffmpeg failed (rc={proc.returncode}): {err}")

    return output_path
