"""Pydantic схемы модуля animations."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from config import settings
from modules.animations.config import (
    ALLOWED_ASPECTS,
    ALLOWED_FPS,
    DEFAULT_DURATION,
    MAX_PROMPT_LENGTH,
)
from modules.animations.models import AnimationJobStatus


class AnimationGenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=MAX_PROMPT_LENGTH)
    duration: int = Field(default=DEFAULT_DURATION, ge=1)
    fps: int = Field(default=settings.animations_default_fps)
    aspect: str = Field(default="9:16")

    @field_validator("duration")
    @classmethod
    def _clamp_duration(cls, v: int) -> int:
        if v > settings.animations_max_duration:
            raise ValueError(
                f"duration must be <= {settings.animations_max_duration}"
            )
        return v

    @field_validator("fps")
    @classmethod
    def _check_fps(cls, v: int) -> int:
        if v not in ALLOWED_FPS:
            raise ValueError(f"fps must be one of {ALLOWED_FPS}")
        return v

    @field_validator("aspect")
    @classmethod
    def _check_aspect(cls, v: str) -> str:
        if v not in ALLOWED_ASPECTS:
            raise ValueError(f"aspect must be one of {ALLOWED_ASPECTS}")
        return v


class AnimationGenerateResponse(BaseModel):
    job_id: UUID
    status: AnimationJobStatus


class AnimationJobPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    job_id: UUID = Field(validation_alias="id")
    status: AnimationJobStatus
    progress: float
    prompt: str
    duration: int
    fps: int
    width: int
    height: int
    download_url: str | None = Field(default=None, validation_alias="output_url")
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime
