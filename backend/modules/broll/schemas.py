"""Pydantic схемы Broll."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SceneKey(str, Enum):
    DATA_FLOW = "data_flow"
    GROWTH_CHART = "growth_chart"
    DIGITAL_GRID = "digital_grid"
    DEEP_FRACTAL = "deep_fractal"
    PARTICLES = "particles"
    CALM_GRADIENT = "calm_gradient"


class SceneParams(BaseModel):
    scene: SceneKey
    color_from: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    color_to: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    speed: float = Field(ge=0.1, le=0.5)
    duration: int = Field(ge=3, le=5)


class BrollGenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=500)


class BrollJobPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    prompt: str
    status: str
    scene: str | None = None
    params: dict | None = None
    error: str | None = None
    created_at: datetime
    updated_at: datetime
