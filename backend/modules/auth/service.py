"""Бизнес-логика auth: регистрация, логин, токены email."""
from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from modules.auth.models import (
    EmailVerificationCode,
    EmailVerificationToken,
    PasswordResetToken,
    User,
    UserProfile,
)
from modules.auth.schemas import RegisterRequest
from modules.auth.utils import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from modules.billing.models import Subscription, SubscriptionStatus


async def register_user(
    db: AsyncSession, payload: RegisterRequest
) -> tuple[User, str, str, str]:
    """Returns (user, access_token, refresh_token, verification_code)."""
    existing = await db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )

    now = datetime.now(timezone.utc)
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        trial_ends_at=now + timedelta(days=settings.trial_days),
    )
    db.add(user)
    await db.flush()

    db.add(UserProfile(user_id=user.id, first_name=payload.first_name, last_name=payload.last_name))
    db.add(
        Subscription(
            user_id=user.id,
            status=SubscriptionStatus.TRIAL,
            current_period_start=now,
            current_period_end=now + timedelta(days=settings.trial_days),
        )
    )

    code = str(random.randint(100000, 999999))
    db.add(
        EmailVerificationCode(
            user_id=user.id,
            code=code,
            expires_at=now + timedelta(minutes=10),
        )
    )

    # Referral attribution
    if payload.referral_code:
        from modules.referrals.service import attach_referral

        await attach_referral(db, user, payload.referral_code)

    await db.commit()
    await db.refresh(user)

    return (
        user,
        create_access_token(user.id),
        create_refresh_token(user.id),
        code,
    )


async def create_verification_code(db: AsyncSession, user: User) -> str:
    """Инвалидирует предыдущие неиспользованные коды и создаёт новый."""
    await db.execute(
        update(EmailVerificationCode)
        .where(
            EmailVerificationCode.user_id == user.id,
            EmailVerificationCode.is_used.is_(False),
        )
        .values(is_used=True)
    )
    code = str(random.randint(100000, 999999))
    rec = EmailVerificationCode(
        user_id=user.id,
        code=code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(rec)
    await db.commit()
    return code


async def verify_email_code(db: AsyncSession, user_id: uuid.UUID, code: str) -> User:
    now = datetime.now(timezone.utc)
    rec = await db.scalar(
        select(EmailVerificationCode)
        .where(
            EmailVerificationCode.user_id == user_id,
            EmailVerificationCode.is_used.is_(False),
            EmailVerificationCode.expires_at > now,
        )
        .order_by(EmailVerificationCode.created_at.desc())
    )
    if rec is None:
        raise HTTPException(status_code=400, detail="Код не найден или истёк")

    rec.attempts += 1
    if rec.attempts > 3:
        rec.is_used = True
        await db.commit()
        raise HTTPException(
            status_code=400,
            detail="Превышено количество попыток. Запросите новый код",
        )

    if rec.code != code:
        await db.commit()
        raise HTTPException(status_code=400, detail="Неверный код")

    rec.is_used = True
    user = await db.scalar(select(User).where(User.id == user_id))
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_email_verified = True
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate(db: AsyncSession, email: str, password: str) -> User:
    user = await db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User is blocked"
        )
    return user


async def confirm_email(db: AsyncSession, token: str) -> User:
    rec = await db.scalar(
        select(EmailVerificationToken).where(EmailVerificationToken.token == token)
    )
    if not rec or rec.is_used or rec.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    rec.is_used = True
    user = await db.scalar(select(User).where(User.id == rec.user_id))
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_email_verified = True
    await db.commit()
    return user


async def create_email_token(db: AsyncSession, user: User) -> str:
    rec = EmailVerificationToken(
        user_id=user.id,
        token=uuid.uuid4().hex,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(rec)
    await db.commit()
    return rec.token


async def create_reset_token(db: AsyncSession, user: User) -> str:
    rec = PasswordResetToken(
        user_id=user.id,
        token=uuid.uuid4().hex,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(rec)
    await db.commit()
    return rec.token


async def reset_password(db: AsyncSession, token: str, new_password: str) -> User:
    rec = await db.scalar(
        select(PasswordResetToken).where(PasswordResetToken.token == token)
    )
    if not rec or rec.is_used or rec.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    rec.is_used = True
    user = await db.scalar(select(User).where(User.id == rec.user_id))
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = hash_password(new_password)
    await db.commit()
    return user
