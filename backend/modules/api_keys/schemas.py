"""Pydantic схемы для api_keys."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    scopes: list[str] = Field(default_factory=lambda: ["read"])
    expires_at: datetime | None = None


class ApiKeyPublic(BaseModel):
    """Список ключей — БЕЗ полного ключа."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    key_prefix: str
    scopes: list[str]
    rate_limit: int
    last_used_at: datetime | None = None
    expires_at: datetime | None = None
    is_active: bool
    created_at: datetime


class ApiKeyCreated(ApiKeyPublic):
    """Возвращается ОДИН РАЗ при создании, содержит full_key."""

    full_key: str
