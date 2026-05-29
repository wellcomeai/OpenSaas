"""Broll: генерация B-roll анимаций по тексту."""
from __future__ import annotations

import os
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import ActiveSubscription, CurrentUser
from modules.broll import service
from modules.broll.models import BrollStatus
from modules.broll.schemas import BrollGenerateRequest, BrollJobPublic

router = APIRouter(prefix="/broll", tags=["broll"])


@router.post(
    "/generate",
    response_model=BrollJobPublic,
    status_code=status.HTTP_201_CREATED,
)
async def generate(
    payload: BrollGenerateRequest,
    user: CurrentUser,
    subscription: ActiveSubscription,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    job = await service.create_job(db, user, payload)
    return BrollJobPublic.model_validate(job)


@router.get("/jobs", response_model=list[BrollJobPublic])
async def list_jobs(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    jobs = await service.list_jobs(db, user)
    return [BrollJobPublic.model_validate(j) for j in jobs]


@router.get("/jobs/{job_id}", response_model=BrollJobPublic)
async def get_job(
    job_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    job = await service.get_job(db, user, job_id)
    return BrollJobPublic.model_validate(job)


@router.get("/jobs/{job_id}/file")
async def get_job_file(
    job_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    job = await service.get_job(db, user, job_id)
    if (
        job.status != BrollStatus.DONE
        or not job.file_path
        or not os.path.isfile(job.file_path)
    ):
        raise HTTPException(status_code=404, detail="File not ready")
    return FileResponse(
        job.file_path,
        media_type="video/mp4",
        filename=f"{job.id}.mp4",
    )
