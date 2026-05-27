"""Бизнес-логика пользователей."""
from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from modules.auth.models import User, UserProfile
from modules.auth.utils import hash_password, verify_password
from modules.users.schemas import PasswordChange, ProfileUpdate


async def get_me(db: AsyncSession, user_id) -> User:
    user = await db.scalar(
        select(User).options(selectinload(User.profile)).where(User.id == user_id)
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


async def update_profile(
    db: AsyncSession, user: User, payload: ProfileUpdate
) -> User:
    profile = await db.scalar(
        select(UserProfile).where(UserProfile.user_id == user.id)
    )
    if profile is None:
        profile = UserProfile(user_id=user.id)
        db.add(profile)

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)

    await db.commit()
    await db.refresh(user, ["profile"])
    return user


async def change_password(
    db: AsyncSession, user: User, payload: PasswordChange
) -> None:
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    user.hashed_password = hash_password(payload.new_password)
    await db.commit()


async def delete_me(db: AsyncSession, user: User) -> None:
    await db.delete(user)
    await db.commit()
