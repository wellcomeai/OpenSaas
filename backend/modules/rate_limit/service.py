"""Rate limiting с Redis или PostgreSQL fallback.

Window: фиксированный час (truncated по часу).
Если REDIS_URL пустой — используем таблицу rate_limit_entries.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from modules.api_keys.models import RateLimitEntry

_redis_client = None
_redis_lock = asyncio.Lock()


async def _get_redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    async with _redis_lock:
        if _redis_client is None:
            from redis.asyncio import from_url

            _redis_client = from_url(settings.redis_url, decode_responses=True)
    return _redis_client


def _current_hour_window() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(minute=0, second=0, microsecond=0)


async def check_rate_limit(
    db: AsyncSession, identifier: str, limit: int
) -> bool:
    """True если запрос разрешён, False если limit превышен."""
    if settings.redis_enabled:
        return await _check_redis(identifier, limit)
    return await _check_postgres(db, identifier, limit)


async def _check_redis(identifier: str, limit: int) -> bool:
    r = await _get_redis()
    window = _current_hour_window().timestamp()
    key = f"rl:{identifier}:{int(window)}"
    count = await r.incr(key)
    if count == 1:
        await r.expire(key, 3700)  # чуть больше часа
    return count <= limit


async def _check_postgres(
    db: AsyncSession, identifier: str, limit: int
) -> bool:
    window = _current_hour_window()
    key = f"{identifier}:{int(window.timestamp())}"

    stmt = (
        pg_insert(RateLimitEntry)
        .values(identifier=key, count=1, window_start=window)
        .on_conflict_do_update(
            index_elements=[RateLimitEntry.identifier],
            set_={"count": RateLimitEntry.count + 1},
        )
        .returning(RateLimitEntry.count)
    )
    result = await db.execute(stmt)
    count = result.scalar_one()
    await db.commit()
    return count <= limit


async def cleanup_old_entries(db: AsyncSession) -> int:
    """Удалить старые записи (старше 2 часов). Вызывается фоновой задачей."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=2)
    result = await db.execute(
        select(RateLimitEntry).where(RateLimitEntry.window_start < cutoff)
    )
    rows = result.scalars().all()
    for row in rows:
        await db.delete(row)
    await db.commit()
    return len(rows)
