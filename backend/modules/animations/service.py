"""Сервис animations: оркестрация конвейера text → mp4 + CRUD задач."""
from __future__ import annotations

import asyncio
import logging
import time
from pathlib import Path
from typing import Sequence
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import AsyncSessionLocal
from modules.animations import openrouter, renderer
from modules.animations.config import resolve_resolution
from modules.animations.models import AnimationJob, AnimationJobStatus
from modules.animations.openrouter import AnimationGenerationError
from modules.animations.renderer import RenderError
from modules.animations.schemas import AnimationGenerateRequest
from modules.auth.models import User

logger = logging.getLogger("animations.service")

# Ограничение параллельных рендеров (Chromium + ffmpeg прожорливы по RAM/CPU).
_render_semaphore = asyncio.Semaphore(max(1, settings.animations_max_concurrency))

# Активные статусы — чтобы лимитировать одновременные задачи пользователя.
_ACTIVE_STATUSES = (
    AnimationJobStatus.QUEUED,
    AnimationJobStatus.GENERATING_HTML,
    AnimationJobStatus.RENDERING,
    AnimationJobStatus.ENCODING,
)


def _output_dir() -> Path:
    return Path(settings.animations_output_dir)


def _download_url(job_id: UUID) -> str:
    return f"/api/v1/animations/jobs/{job_id}/download"


# === CRUD ===

async def create_job(
    db: AsyncSession, user: User, payload: AnimationGenerateRequest
) -> AnimationJob:
    # Простой анти-абьюз: не больше одной активной задачи на пользователя.
    active = await db.scalar(
        select(AnimationJob).where(
            AnimationJob.user_id == user.id,
            AnimationJob.status.in_(_ACTIVE_STATUSES),
        )
    )
    if active is not None:
        raise HTTPException(
            status_code=429,
            detail="You already have an animation in progress. Please wait.",
        )

    width, height = resolve_resolution(payload.aspect)
    job = AnimationJob(
        user_id=user.id,
        prompt=payload.prompt,
        duration=payload.duration,
        fps=payload.fps,
        width=width,
        height=height,
        status=AnimationJobStatus.QUEUED,
        progress=0.0,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    asyncio.create_task(process_job(job.id))
    return job


async def get_job(db: AsyncSession, user: User, job_id: UUID) -> AnimationJob:
    job = await db.get(AnimationJob, job_id)
    if job is None or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


async def list_jobs(
    db: AsyncSession, user: User, *, limit: int = 50, offset: int = 0
) -> Sequence[AnimationJob]:
    return (
        await db.scalars(
            select(AnimationJob)
            .where(AnimationJob.user_id == user.id)
            .order_by(AnimationJob.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
    ).all()


# === Background orchestration ===

async def _set_status(
    db: AsyncSession,
    job: AnimationJob,
    status: AnimationJobStatus,
    *,
    progress: float | None = None,
    **fields: object,
) -> None:
    job.status = status
    if progress is not None:
        job.progress = progress
    for key, value in fields.items():
        setattr(job, key, value)
    await db.commit()


async def process_job(job_id: UUID) -> None:
    """Полный конвейер задачи. Запускается как фоновая asyncio-задача.

    Открывает собственную сессию БД (живёт всё время задачи). Гарантирует
    очистку временных файлов через try/finally.
    """
    work_dir = _output_dir() / "work" / str(job_id)
    async with AsyncSessionLocal() as db:
        job = await db.get(AnimationJob, job_id)
        if job is None:
            logger.error("process_job: job %s not found", job_id)
            return

        fps = job.fps
        duration = job.duration
        width = job.width
        height = job.height
        prompt = job.prompt

        try:
            # 1. Генерация HTML через LLM.
            await _set_status(
                db, job, AnimationJobStatus.GENERATING_HTML, progress=0.0
            )
            html = await openrouter.generate_animation_html(
                prompt=prompt, duration=duration, width=width, height=height
            )
            job.html = html
            await db.commit()

            async with _render_semaphore:
                # 2. Покадровый рендер.
                await _set_status(
                    db, job, AnimationJobStatus.RENDERING, progress=0.0
                )

                last_commit = 0.0

                async def on_progress(fraction: float) -> None:
                    nonlocal last_commit
                    now = time.monotonic()
                    # Троттлим запись в БД: не чаще ~раз в 0.7с (или на финале).
                    if fraction >= 1.0 or now - last_commit >= 0.7:
                        last_commit = now
                        job.progress = round(fraction, 4)
                        await db.commit()

                frames_dir, _total = await renderer.capture_frames(
                    html=html,
                    job_dir=work_dir,
                    fps=fps,
                    duration=duration,
                    width=width,
                    height=height,
                    on_progress=on_progress,
                )

                # 3. Склейка в mp4.
                await _set_status(
                    db, job, AnimationJobStatus.ENCODING, progress=1.0
                )
                output_path = _output_dir() / f"{job_id}.mp4"
                await renderer.encode_video(
                    frames_dir=frames_dir, output_path=output_path, fps=fps
                )

            # 4. Готово.
            await _set_status(
                db,
                job,
                AnimationJobStatus.DONE,
                progress=1.0,
                output_path=str(output_path),
                output_url=_download_url(job_id),
            )
            logger.info("Animation job %s done: %s", job_id, output_path)

        except (AnimationGenerationError, RenderError) as exc:
            logger.warning("Animation job %s failed: %s", job_id, exc)
            await _safe_error(db, job, str(exc))
        except Exception as exc:  # noqa: BLE001
            logger.exception("Animation job %s crashed", job_id)
            await _safe_error(db, job, f"Unexpected error: {exc}")
        finally:
            # Всегда чистим тяжёлые временные файлы (кадры + index.html).
            renderer.cleanup_frames(work_dir)


async def _safe_error(
    db: AsyncSession, job: AnimationJob, message: str
) -> None:
    try:
        job.status = AnimationJobStatus.ERROR
        job.error_message = message[:4000]
        await db.commit()
    except Exception:  # noqa: BLE001
        logger.exception("Failed to persist error status for job %s", job.id)
        await db.rollback()
