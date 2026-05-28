"""Pydantic схемы CodeAI."""
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from modules.codeai.models import (
    CodeAIMessageRole,
    CodeAIMessageType,
    CodeAISessionStatus,
)


# === GitHub / Repos ===

class CodeAIRepoPublic(BaseModel):
    full_name: str
    default_branch: str
    description: str | None = None


# === Projects ===

class CodeAIProjectCreate(BaseModel):
    repo_full_name: str = Field(min_length=1, max_length=255)
    github_installation_id: str = Field(min_length=1, max_length=64)
    repo_default_branch: str | None = None


class CodeAIProjectPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    github_installation_id: str
    repo_full_name: str
    repo_default_branch: str
    is_indexed: bool
    indexed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class CodeAIProjectStatus(BaseModel):
    is_indexed: bool
    indexed_at: datetime | None
    chunks_count: int = 0


# === Sessions ===

class CodeAISessionCreate(BaseModel):
    project_id: UUID
    task: str = Field(min_length=1)


class CodeAISessionPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    user_id: UUID
    status: CodeAISessionStatus
    task: str
    plan: dict[str, Any] | None
    pr_url: str | None
    branch_name: str | None
    created_at: datetime
    updated_at: datetime


# === Messages ===

class CodeAIMessagePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    session_id: UUID
    role: CodeAIMessageRole
    content: str
    message_type: CodeAIMessageType
    metadata: dict[str, Any] | None = Field(default=None, alias="meta")
    created_at: datetime


# === Models / Settings ===

class CodeAIModelPricing(BaseModel):
    prompt: str | None = None
    completion: str | None = None


class CodeAIModelPublic(BaseModel):
    id: str
    name: str
    description: str | None = None
    context_length: int
    pricing: CodeAIModelPricing


class CodeAISettingsPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    planning_model: str
    editing_model: str


class CodeAISettingsUpdate(BaseModel):
    planning_model: str | None = None
    editing_model: str | None = None
