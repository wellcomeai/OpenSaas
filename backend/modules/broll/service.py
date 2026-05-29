"""Сервис Broll: CRUD + оркестрация фоновой задачи рендера."""
from __future__ import annotations

import asyncio
import logging
from typing import Sequence
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import AsyncSessionLocal
from modules.auth.models import User
from modules.broll import llm, renderer
from modules.broll.models import BrollJob, BrollStatus
from modules.broll.schemas import BrollGenerateRequest

logger = logging.getLogger("broll.service")


async def create_job(
    db: AsyncSession, user: User, payload: BrollGenerateRequest
) -> BrollJob:
    job = BrollJob(
        user_id=user.id,
        prompt=payload.prompt,
        status=BrollStatus.PENDING,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    asyncio.create_task(_run_job(job.id))
    return job


async def _run_job(job_id: UUID) -> None:
    """Background task: открывает собственную DB сессию и рендерит ролик.

    Джоба обязана всегда завершаться (done|error) — пользователь брака
    не видит благодаря фоллбэку в llm.choose_scene.
    """
    async with AsyncSessionLocal() as db:
        job = await db.get(BrollJob, job_id)
        if job is None:
            return
        try:
            job.status = BrollStatus.PROCESSING
            await db.commit()

            params = await llm.choose_scene(job.prompt)
            job.scene = params.scene.value
            job.params = params.model_dump(mode="json")
            await db.commit()

            file_path = await renderer.render(params, job.id)

            job.file_path = file_path
            job.status = BrollStatus.DONE
            await db.commit()
        except Exception as e:  # noqa: BLE001
            logger.exception("broll job %s failed", job_id)
            job.status = BrollStatus.ERROR
            job.error = str(e)
            await db.commit()


async def list_jobs(db: AsyncSession, user: User) -> Sequence[BrollJob]:
    return (
        await db.scalars(
            select(BrollJob)
            .where(BrollJob.user_id == user.id)
            .order_by(BrollJob.created_at.desc())
        )
    ).all()


async def get_job(db: AsyncSession, user: User, job_id: UUID) -> BrollJob:
    job = await db.get(BrollJob, job_id)
    if job is None or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
