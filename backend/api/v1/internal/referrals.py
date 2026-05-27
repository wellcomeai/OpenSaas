"""Referrals endpoints (internal)."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from dependencies import CurrentUser
from modules.referrals import service as ref_service
from modules.referrals.schemas import (
    MyReferralCode,
    ReferralPayoutPublic,
    ReferralStats,
    ReferralUserPublic,
)

router = APIRouter(prefix="/referrals", tags=["referrals"])


@router.get("/my-code", response_model=MyReferralCode)
async def my_code(
    user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]
):
    code = await ref_service.get_or_create_code(db, user)
    stats = await ref_service.calculate_stats(db, user)
    return MyReferralCode(
        code=code.code,
        url=f"{settings.app_url}/ref/{code.code}",
        stats=stats,
    )


@router.get("/stats", response_model=ReferralStats)
async def stats(
    user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]
):
    return await ref_service.calculate_stats(db, user)


@router.get("/payouts", response_model=list[ReferralPayoutPublic])
async def payouts(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    items = await ref_service.list_payouts(db, user, limit, offset)
    return [ReferralPayoutPublic.model_validate(p) for p in items]


@router.get("/referred-users", response_model=list[ReferralUserPublic])
async def referred_users(
    user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]
):
    items = await ref_service.list_referred_users(db, user)
    return [ReferralUserPublic.model_validate(i) for i in items]
