"""API key management (internal)."""
from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import CurrentUser
from modules.api_keys import service as keys_service
from modules.api_keys.schemas import ApiKeyCreate, ApiKeyCreated, ApiKeyPublic

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


@router.get("", response_model=list[ApiKeyPublic])
async def list_keys(
    user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]
):
    items = await keys_service.list_keys(db, user)
    return [ApiKeyPublic.model_validate(k) for k in items]


@router.post("", response_model=ApiKeyCreated, status_code=status.HTTP_201_CREATED)
async def create_key(
    payload: ApiKeyCreate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    obj, full_key = await keys_service.create_key(db, user, payload)
    return ApiKeyCreated(
        **ApiKeyPublic.model_validate(obj).model_dump(),
        full_key=full_key,
    )


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_key(
    key_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await keys_service.delete_key(db, user, key_id)
    return None


@router.patch("/{key_id}/revoke", response_model=ApiKeyPublic)
async def revoke_key(
    key_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    obj = await keys_service.revoke_key(db, user, key_id)
    return ApiKeyPublic.model_validate(obj)
