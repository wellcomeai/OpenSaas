"""Admin endpoints (internal, role=admin required)."""
from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import AdminUser, require_admin
from modules.admin import service as admin_service
from modules.auth.models import UserRole
from modules.auth.schemas import UserPublic
from modules.billing.schemas import PaymentPublic
from modules.referrals import service as ref_service
from modules.referrals.models import ReferralPayoutStatus
from modules.referrals.schemas import AdminReferralPayoutPublic

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


class RoleUpdate(BaseModel):
    role: UserRole


@router.get("/stats")
async def stats(db: Annotated[AsyncSession, Depends(get_db)]):
    return await admin_service.stats(db)


@router.get("/users", response_model=list[UserPublic])
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    role: str | None = None,
    status: str | None = Query(default=None),
):
    is_active = None
    if status == "blocked":
        is_active = False
    elif status == "active":
        is_active = True
    items = await admin_service.list_users(
        db, page=page, limit=limit, role=role, is_active=is_active
    )
    return [UserPublic.model_validate(u) for u in items]


@router.patch("/users/{user_id}/role", response_model=UserPublic)
async def set_role(
    user_id: UUID,
    payload: RoleUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = await admin_service.set_role(db, user_id, payload.role)
    return UserPublic.model_validate(user)


@router.patch("/users/{user_id}/block", response_model=UserPublic)
async def block_user(
    user_id: UUID, db: Annotated[AsyncSession, Depends(get_db)]
):
    user = await admin_service.set_active(db, user_id, False)
    return UserPublic.model_validate(user)


@router.patch("/users/{user_id}/unblock", response_model=UserPublic)
async def unblock_user(
    user_id: UUID, db: Annotated[AsyncSession, Depends(get_db)]
):
    user = await admin_service.set_active(db, user_id, True)
    return UserPublic.model_validate(user)


@router.get("/payments", response_model=list[PaymentPublic])
async def list_payments(
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(100, ge=1, le=500),
):
    items = await admin_service.list_payments(db, limit=limit)
    return [PaymentPublic.model_validate(p) for p in items]


@router.get("/referrals/payouts", response_model=list[AdminReferralPayoutPublic])
async def list_referral_payouts(
    db: Annotated[AsyncSession, Depends(get_db)],
    status: ReferralPayoutStatus | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    items = await ref_service.admin_list_payouts(
        db, status_filter=status, limit=limit, offset=offset
    )
    return [AdminReferralPayoutPublic.model_validate(p) for p in items]


@router.patch(
    "/referrals/payouts/{payout_id}/approve",
    response_model=AdminReferralPayoutPublic,
)
async def approve_payout(
    payout_id: UUID, db: Annotated[AsyncSession, Depends(get_db)]
):
    p = await ref_service.admin_set_payout_status(
        db, payout_id, ReferralPayoutStatus.APPROVED
    )
    return AdminReferralPayoutPublic.model_validate(p)


@router.patch(
    "/referrals/payouts/{payout_id}/mark-paid",
    response_model=AdminReferralPayoutPublic,
)
async def mark_paid(
    payout_id: UUID, db: Annotated[AsyncSession, Depends(get_db)]
):
    p = await ref_service.admin_set_payout_status(
        db, payout_id, ReferralPayoutStatus.PAID
    )
    return AdminReferralPayoutPublic.model_validate(p)


@router.patch(
    "/referrals/payouts/{payout_id}/reject",
    response_model=AdminReferralPayoutPublic,
)
async def reject_payout(
    payout_id: UUID, db: Annotated[AsyncSession, Depends(get_db)]
):
    p = await ref_service.admin_set_payout_status(
        db, payout_id, ReferralPayoutStatus.REJECTED
    )
    return AdminReferralPayoutPublic.model_validate(p)
