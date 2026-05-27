"""Pydantic схемы для users."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ProfileUpdate(BaseModel):
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    avatar_url: str | None = Field(default=None, max_length=500)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class ProfilePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    first_name: str | None = None
    last_name: str | None = None
    avatar_url: str | None = None


class UserMe(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    role: str
    is_active: bool
    is_email_verified: bool
    trial_ends_at: datetime | None = None
    created_at: datetime
    profile: ProfilePublic | None = None
