"""Public /me — для внешних интеграций через API ключ."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from modules.api_keys.middleware import ApiKeyUser
from modules.billing import service as billing_service
from modules.users.schemas import UserMe

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/me")
async def me(
    user: ApiKeyUser, db: Annotated[AsyncSession, Depends(get_db)]
):
    me_data = UserMe.model_validate(user).model_dump(mode="json")
    sub = await billing_service.get_user_subscription(db, user.id)
    me_data["subscription_status"] = sub.status.value if sub else None
    return me_data
