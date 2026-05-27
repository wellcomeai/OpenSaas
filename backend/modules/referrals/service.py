"""Бизнес-логика реферальной программы."""
from __future__ import annotations

import secrets
from datetime import datetime
from decimal import Decimal
from typing import Sequence

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from modules.auth.models import User, UserProfile
from modules.billing.models import Payment
from modules.referrals.models import (
    ReferralCode,
    ReferralLink,
    ReferralLinkStatus,
    ReferralPayout,
    ReferralPayoutStatus,
)
from modules.referrals.schemas import ReferralStats


def _generate_code() -> str:
    return "OS" + secrets.token_urlsafe(6).upper().replace("_", "").replace("-", "")[:8]


async def get_or_create_code(db: AsyncSession, user: User) -> ReferralCode:
    code = await db.scalar(select(ReferralCode).where(ReferralCode.user_id == user.id))
    if code:
        return code

    for _ in range(5):
        candidate = _generate_code()
        existing = await db.scalar(
            select(ReferralCode).where(ReferralCode.code == candidate)
        )
        if not existing:
            code = ReferralCode(user_id=user.id, code=candidate)
            db.add(code)
            await db.commit()
            await db.refresh(code)
            return code
    raise HTTPException(status_code=500, detail="Failed to generate referral code")


async def attach_referral(db: AsyncSession, new_user: User, code: str) -> None:
    """Привязать нового пользователя к коду реферера (на регистрации)."""
    ref_code = await db.scalar(
        select(ReferralCode).where(
            ReferralCode.code == code, ReferralCode.is_active == True  # noqa: E712
        )
    )
    if ref_code is None or ref_code.user_id == new_user.id:
        return
    new_user.referred_by_id = ref_code.user_id
    db.add(
        ReferralLink(
            referral_code_id=ref_code.id,
            referred_user_id=new_user.id,
            status=ReferralLinkStatus.REGISTERED,
        )
    )


async def calculate_stats(db: AsyncSession, user: User) -> ReferralStats:
    code = await db.scalar(select(ReferralCode).where(ReferralCode.user_id == user.id))
    if code is None:
        return ReferralStats(
            total_referred=0,
            converted=0,
            total_earned=Decimal("0"),
            pending_payout=Decimal("0"),
        )

    total_referred = await db.scalar(
        select(func.count(ReferralLink.id)).where(
            ReferralLink.referral_code_id == code.id
        )
    )
    converted = await db.scalar(
        select(func.count(ReferralLink.id)).where(
            ReferralLink.referral_code_id == code.id,
            ReferralLink.status == ReferralLinkStatus.CONVERTED,
        )
    )
    total_earned = await db.scalar(
        select(func.coalesce(func.sum(ReferralPayout.amount), 0)).where(
            ReferralPayout.referrer_id == user.id,
            ReferralPayout.status == ReferralPayoutStatus.PAID,
        )
    )
    pending = await db.scalar(
        select(func.coalesce(func.sum(ReferralPayout.amount), 0)).where(
            ReferralPayout.referrer_id == user.id,
            ReferralPayout.status.in_(
                [ReferralPayoutStatus.PENDING, ReferralPayoutStatus.APPROVED]
            ),
        )
    )

    return ReferralStats(
        total_referred=total_referred or 0,
        converted=converted or 0,
        total_earned=Decimal(total_earned or 0),
        pending_payout=Decimal(pending or 0),
    )


async def list_referred_users(
    db: AsyncSession, user: User
) -> list[dict]:
    code = await db.scalar(
        select(ReferralCode).where(ReferralCode.user_id == user.id)
    )
    if code is None:
        return []

    rows = await db.execute(
        select(
            User.email,
            UserProfile.first_name,
            UserProfile.last_name,
            ReferralLink.status,
            ReferralLink.created_at,
        )
        .join(ReferralLink, ReferralLink.referred_user_id == User.id)
        .outerjoin(UserProfile, UserProfile.user_id == User.id)
        .where(ReferralLink.referral_code_id == code.id)
        .order_by(ReferralLink.created_at.desc())
    )
    return [
        {
            "email": row.email,
            "first_name": row.first_name,
            "last_name": row.last_name,
            "status": row.status.value,
            "created_at": row.created_at,
        }
        for row in rows
    ]


async def list_payouts(
    db: AsyncSession, user: User, limit: int = 50, offset: int = 0
) -> Sequence[ReferralPayout]:
    return (
        await db.scalars(
            select(ReferralPayout)
            .where(ReferralPayout.referrer_id == user.id)
            .order_by(ReferralPayout.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
    ).all()


async def process_payment_for_referral(
    db: AsyncSession, payment: Payment
) -> ReferralPayout | None:
    """Вызывается из webhook-а при успешной оплате.

    Если у плательщика есть реферер — создаёт ReferralPayout (pending)
    на 20% (REFERRAL_COMMISSION_PERCENT) от суммы.
    """
    payer = await db.get(User, payment.user_id)
    if payer is None or payer.referred_by_id is None:
        return None

    # Обновляем статус ReferralLink на converted
    link = await db.scalar(
        select(ReferralLink).where(ReferralLink.referred_user_id == payer.id)
    )
    if link is not None:
        link.status = ReferralLinkStatus.CONVERTED

    commission = (
        Decimal(payment.amount)
        * Decimal(settings.referral_commission_percent)
        / Decimal(100)
    ).quantize(Decimal("0.01"))

    payout = ReferralPayout(
        referrer_id=payer.referred_by_id,
        referred_user_id=payer.id,
        payment_id=payment.id,
        amount=commission,
        status=ReferralPayoutStatus.PENDING,
    )
    db.add(payout)
    await db.flush()
    return payout


async def admin_list_payouts(
    db: AsyncSession,
    status_filter: ReferralPayoutStatus | None = None,
    limit: int = 100,
    offset: int = 0,
) -> Sequence[ReferralPayout]:
    q = select(ReferralPayout).order_by(ReferralPayout.created_at.desc())
    if status_filter is not None:
        q = q.where(ReferralPayout.status == status_filter)
    return (await db.scalars(q.limit(limit).offset(offset))).all()


async def admin_set_payout_status(
    db: AsyncSession, payout_id, new_status: ReferralPayoutStatus
) -> ReferralPayout:
    payout = await db.get(ReferralPayout, payout_id)
    if payout is None:
        raise HTTPException(status_code=404, detail="Payout not found")
    payout.status = new_status
    if new_status == ReferralPayoutStatus.PAID:
        payout.paid_at = datetime.utcnow()
    await db.commit()
    await db.refresh(payout)
    return payout
