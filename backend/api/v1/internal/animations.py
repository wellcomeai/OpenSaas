"""Animations: генерация видео-анимаций из текста (text → mp4)."""
from __future__ import annotations

import os
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import CurrentUser
from modules.animations import service
from modules.animations.models import AnimationJobStatus
from modules.animations.schemas import (
    AnimationGenerateRequest,
    AnimationGenerateResponse,
    AnimationJobPublic,
)

router = APIRouter(prefix="/animations", tags=["animations"])


@router.post(
    "/generate",
    response_model=AnimationGenerateResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate(
    payload: AnimationGenerateRequest,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Создаёт задачу и сразу возвращает job_id (рендер идёт в фоне)."""
    job = await service.create_job(db, user, payload)
    return AnimationGenerateResponse(job_id=job.id, status=job.status)


@router.get("/jobs", response_model=list[AnimationJobPublic])
async def list_jobs(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 50,
    offset: int = 0,
):
    items = await service.list_jobs(db, user, limit=limit, offset=offset)
    return [AnimationJobPublic.model_validate(j) for j in items]


@router.get("/jobs/{job_id}", response_model=AnimationJobPublic)
async def get_job(
    job_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    job = await service.get_job(db, user, job_id)
    return AnimationJobPublic.model_validate(job)


@router.get("/jobs/{job_id}/download")
async def download(
    job_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Отдаёт готовый mp4 (attachment)."""
    job = await service.get_job(db, user, job_id)
    if job.status != AnimationJobStatus.DONE or not job.output_path:
        raise HTTPException(status_code=409, detail="Animation is not ready")
    if not os.path.isfile(job.output_path):
        raise HTTPException(
            status_code=410, detail="Animation file is no longer available"
        )
    return FileResponse(
        job.output_path,
        media_type="video/mp4",
        filename=f"animation-{job_id}.mp4",
        headers={
            "Content-Disposition": f'attachment; filename="animation-{job_id}.mp4"'
        },
    )
