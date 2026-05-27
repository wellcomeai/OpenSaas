"""User endpoints (internal)."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import CurrentUser
from modules.users import service as users_service
from modules.users.schemas import PasswordChange, ProfileUpdate, UserMe

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserMe)
async def me(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    full = await users_service.get_me(db, user.id)
    return UserMe.model_validate(full)


@router.put("/me", response_model=UserMe)
async def update_me(
    payload: ProfileUpdate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    updated = await users_service.update_profile(db, user, payload)
    return UserMe.model_validate(updated)


@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: PasswordChange,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await users_service.change_password(db, user, payload)
    return None


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await users_service.delete_me(db, user)
    return None
