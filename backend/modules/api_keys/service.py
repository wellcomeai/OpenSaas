"""Бизнес-логика API ключей."""
from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Sequence
from uuid import UUID

from fastapi import HTTPException
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.auth.models import User
from modules.api_keys.models import ApiKey
from modules.api_keys.schemas import ApiKeyCreate

KEY_PREFIX_LENGTH = 16
PREFIX = "osk_live_"

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _hash_key(key: str) -> str:
    return _pwd.hash(key)


def _verify_key(key: str, key_hash: str) -> bool:
    return _pwd.verify(key, key_hash)


async def create_key(
    db: AsyncSession, user: User, payload: ApiKeyCreate
) -> tuple[ApiKey, str]:
    if not user.is_email_verified:
        raise HTTPException(
            status_code=403, detail="Confirm email before creating API keys"
        )

    secret = secrets.token_urlsafe(32)
    full_key = PREFIX + secret
    key_prefix = full_key[:KEY_PREFIX_LENGTH]

    obj = ApiKey(
        user_id=user.id,
        name=payload.name,
        key_prefix=key_prefix,
        key_hash=_hash_key(full_key),
        scopes=payload.scopes,
        expires_at=payload.expires_at,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj, full_key


async def list_keys(db: AsyncSession, user: User) -> Sequence[ApiKey]:
    return (
        await db.scalars(
            select(ApiKey)
            .where(ApiKey.user_id == user.id)
            .order_by(ApiKey.created_at.desc())
        )
    ).all()


async def delete_key(db: AsyncSession, user: User, key_id: UUID) -> None:
    obj = await db.get(ApiKey, key_id)
    if obj is None or obj.user_id != user.id:
        raise HTTPException(status_code=404, detail="Key not found")
    await db.delete(obj)
    await db.commit()


async def revoke_key(db: AsyncSession, user: User, key_id: UUID) -> ApiKey:
    obj = await db.get(ApiKey, key_id)
    if obj is None or obj.user_id != user.id:
        raise HTTPException(status_code=404, detail="Key not found")
    obj.is_active = False
    await db.commit()
    await db.refresh(obj)
    return obj


async def authenticate_api_key(db: AsyncSession, full_key: str) -> tuple[ApiKey, User]:
    """Проверка API ключа. Возвращает (ApiKey, User) или 401."""
    if not full_key.startswith(PREFIX):
        raise HTTPException(status_code=401, detail="Invalid API key format")

    key_prefix = full_key[:KEY_PREFIX_LENGTH]
    candidates = (
        await db.scalars(select(ApiKey).where(ApiKey.key_prefix == key_prefix))
    ).all()

    matched: ApiKey | None = None
    for c in candidates:
        if _verify_key(full_key, c.key_hash):
            matched = c
            break

    if matched is None or not matched.is_active:
        raise HTTPException(status_code=401, detail="Invalid API key")
    if matched.expires_at and matched.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="API key expired")

    matched.last_used_at = datetime.now(timezone.utc)
    user = await db.get(User, matched.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive")
    await db.commit()
    return matched, user
