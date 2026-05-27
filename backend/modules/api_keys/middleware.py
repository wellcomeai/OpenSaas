"""FastAPI dependency для аутентификации по API ключу.

Используется в роутах /api/v1/public/* — публичный API для внешних
интеграций.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from modules.api_keys.service import authenticate_api_key
from modules.auth.models import User
from modules.rate_limit.service import check_rate_limit


async def get_api_key_user(
    authorization: Annotated[str | None, Header()] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,  # type: ignore[assignment]
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    token = authorization[7:].strip()
    api_key, user = await authenticate_api_key(db, token)

    allowed = await check_rate_limit(
        db, identifier=f"api_key:{api_key.id}", limit=api_key.rate_limit
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
        )
    return user


ApiKeyUser = Annotated[User, Depends(get_api_key_user)]
