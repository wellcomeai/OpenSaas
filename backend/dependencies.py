"""Общие FastAPI зависимости.

- get_current_user: JWT auth для internal API
- require_admin: проверка роли админа
- require_active_subscription: проверка trial/active подписки
"""
from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from modules.auth.models import User
from modules.billing.models import Subscription, SubscriptionStatus

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(
    token: Annotated[str | None, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        user_id: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")
        if user_id is None or token_type != "access":
            raise credentials_exc
    except JWTError as exc:
        raise credentials_exc from exc

    user = await db.scalar(select(User).where(User.id == UUID(user_id)))
    if user is None or not user.is_active:
        raise credentials_exc
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def require_admin(user: CurrentUser) -> User:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required"
        )
    return user


AdminUser = Annotated[User, Depends(require_admin)]


async def require_active_subscription(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Subscription:
    """Разрешает доступ если подписка trial (не истёкший) или active."""
    from datetime import datetime, timezone

    sub = await db.scalar(
        select(Subscription).where(Subscription.user_id == user.id)
    )
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"message": "No subscription", "redirect": "/billing"},
        )

    now = datetime.now(timezone.utc)
    if sub.status == SubscriptionStatus.TRIAL:
        if sub.current_period_end and sub.current_period_end > now:
            return sub
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"message": "Trial expired", "redirect": "/billing"},
        )
    if sub.status == SubscriptionStatus.ACTIVE:
        return sub
    raise HTTPException(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        detail={"message": "Subscription inactive", "redirect": "/billing"},
    )


ActiveSubscription = Annotated[Subscription, Depends(require_active_subscription)]
