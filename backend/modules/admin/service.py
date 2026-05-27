"""Бизнес-логика админки."""
from __future__ import annotations

from decimal import Decimal
from typing import Sequence
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.auth.models import User, UserRole
from modules.billing.models import Payment, PaymentStatus, Subscription, SubscriptionStatus
from modules.referrals.models import ReferralPayout, ReferralPayoutStatus


async def stats(db: AsyncSession) -> dict:
    total_users = await db.scalar(select(func.count(User.id)))
    active_subs = await db.scalar(
        select(func.count(Subscription.id)).where(
            Subscription.status == SubscriptionStatus.ACTIVE
        )
    )
    mrr = await db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.status == PaymentStatus.SUCCESS
        )
    )
    pending_payouts = await db.scalar(
        select(func.coalesce(func.sum(ReferralPayout.amount), 0)).where(
            ReferralPayout.status.in_(
                [ReferralPayoutStatus.PENDING, ReferralPayoutStatus.APPROVED]
            )
        )
    )

    return {
        "total_users": total_users or 0,
        "active_subscriptions": active_subs or 0,
        "mrr": Decimal(mrr or 0),
        "pending_payouts": Decimal(pending_payouts or 0),
    }


async def list_users(
    db: AsyncSession,
    page: int = 1,
    limit: int = 20,
    role: str | None = None,
    is_active: bool | None = None,
) -> Sequence[User]:
    q = select(User).order_by(User.created_at.desc())
    if role:
        q = q.where(User.role == role)
    if is_active is not None:
        q = q.where(User.is_active == is_active)
    return (await db.scalars(q.limit(limit).offset((page - 1) * limit))).all()


async def set_role(db: AsyncSession, user_id: UUID, role: UserRole) -> User:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = role
    await db.commit()
    return user


async def set_active(db: AsyncSession, user_id: UUID, is_active: bool) -> User:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = is_active
    await db.commit()
    return user


async def list_payments(db: AsyncSession, limit: int = 100) -> Sequence[Payment]:
    return (
        await db.scalars(
            select(Payment).order_by(Payment.created_at.desc()).limit(limit)
        )
    ).all()
