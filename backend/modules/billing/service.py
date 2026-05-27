"""Бизнес-логика биллинга."""
from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Sequence
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from modules.auth.models import User
from modules.billing import robokassa, stripe as stripe_mod
from modules.billing.models import (
    Payment,
    PaymentProvider,
    PaymentStatus,
    Plan,
    PlanInterval,
    Subscription,
    SubscriptionStatus,
)


async def list_plans(db: AsyncSession) -> Sequence[Plan]:
    return (
        await db.scalars(
            select(Plan).where(Plan.is_active == True).order_by(Plan.sort_order)  # noqa: E712
        )
    ).all()


async def get_user_subscription(db: AsyncSession, user_id: UUID) -> Subscription | None:
    return await db.scalar(select(Subscription).where(Subscription.user_id == user_id))


async def create_payment_for_plan(
    db: AsyncSession, user: User, plan_id: UUID, provider: str
) -> tuple[str, Payment]:
    plan = await db.get(Plan, plan_id)
    if plan is None or not plan.is_active:
        raise HTTPException(status_code=404, detail="Plan not found")

    try:
        provider_enum = PaymentProvider(provider)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid provider")

    sub = await get_user_subscription(db, user.id)

    numeric_inv_id = str(int(time.time() * 1000))

    payment = Payment(
        user_id=user.id,
        subscription_id=sub.id if sub else None,
        amount=plan.price,
        currency=plan.currency,
        status=PaymentStatus.PENDING,
        provider=provider_enum,
        provider_payment_id=numeric_inv_id,
        payment_metadata={"plan_id": str(plan.id), "plan_name": plan.name},
    )
    db.add(payment)
    await db.flush()

    if provider_enum == PaymentProvider.ROBOKASSA:
        url = robokassa.build_payment_url(
            inv_id=numeric_inv_id,
            amount=plan.price,
            description=f"{settings.app_name} — {plan.name}",
            user_email=user.email,
        )
    elif provider_enum == PaymentProvider.STRIPE:
        url = stripe_mod.build_checkout_url(str(plan.id), plan.price, user.email)
    else:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    await db.commit()
    await db.refresh(payment)
    return url, payment


async def cancel_subscription(db: AsyncSession, user: User) -> Subscription:
    sub = await get_user_subscription(db, user.id)
    if sub is None:
        raise HTTPException(status_code=404, detail="No subscription")
    sub.cancelled_at = datetime.now(timezone.utc)
    sub.status = SubscriptionStatus.CANCELLED
    await db.commit()
    return sub


async def list_user_payments(db: AsyncSession, user: User) -> Sequence[Payment]:
    return (
        await db.scalars(
            select(Payment)
            .where(Payment.user_id == user.id)
            .order_by(Payment.created_at.desc())
        )
    ).all()


async def activate_paid_subscription(
    db: AsyncSession, payment: Payment
) -> Subscription:
    """Активирует подписку после успешной оплаты.

    Используется webhook-ами. Берёт plan_id из payment.metadata.
    """
    plan_id_raw = (payment.payment_metadata or {}).get("plan_id")
    if not plan_id_raw:
        raise HTTPException(
            status_code=500, detail="Payment metadata missing plan_id"
        )

    plan = await db.get(Plan, UUID(plan_id_raw))
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")

    sub = await db.scalar(
        select(Subscription).where(Subscription.user_id == payment.user_id)
    )
    now = datetime.now(timezone.utc)
    period = (
        timedelta(days=30)
        if plan.interval == PlanInterval.MONTH
        else timedelta(days=365)
    )

    if sub is None:
        sub = Subscription(
            user_id=payment.user_id,
            plan_id=plan.id,
            status=SubscriptionStatus.ACTIVE,
            current_period_start=now,
            current_period_end=now + period,
        )
        db.add(sub)
    else:
        sub.plan_id = plan.id
        sub.status = SubscriptionStatus.ACTIVE
        sub.current_period_start = now
        sub.current_period_end = now + period
        sub.cancelled_at = None

    payment.subscription_id = sub.id
    await db.flush()
    return sub
