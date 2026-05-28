"""SQLAlchemy модели CodeAI модуля."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


EMBEDDING_DIM = 1536


class CodeAISessionStatus(str, enum.Enum):
    IDLE = "idle"
    PLANNING = "planning"
    AWAITING_CONFIRMATION = "awaiting_confirmation"
    EXECUTING = "executing"
    DONE = "done"
    ERROR = "error"


class CodeAIMessageRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class CodeAIMessageType(str, enum.Enum):
    CHAT = "chat"
    PLAN = "plan"
    STATUS = "status"
    DIFF = "diff"


class CodeAIProject(Base):
    __tablename__ = "codeai_projects"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    github_installation_id: Mapped[str] = mapped_column(String(64), nullable=False)
    repo_full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    repo_default_branch: Mapped[str] = mapped_column(
        String(255), nullable=False, server_default="main"
    )
    is_indexed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    indexed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class CodeAIChunk(Base):
    __tablename__ = "codeai_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("codeai_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    start_line: Mapped[int] = mapped_column(Integer, nullable=False)
    end_line: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(EMBEDDING_DIM), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class CodeAISession(Base):
    __tablename__ = "codeai_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("codeai_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[CodeAISessionStatus] = mapped_column(
        Enum(
            CodeAISessionStatus,
            name="codeai_session_status",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=CodeAISessionStatus.IDLE,
    )
    task: Mapped[str] = mapped_column(Text, nullable=False)
    plan: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    pr_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    branch_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class CodeAIMessage(Base):
    __tablename__ = "codeai_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("codeai_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[CodeAIMessageRole] = mapped_column(
        Enum(
            CodeAIMessageRole,
            name="codeai_message_role",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[CodeAIMessageType] = mapped_column(
        Enum(
            CodeAIMessageType,
            name="codeai_message_type",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=CodeAIMessageType.CHAT,
    )
    meta: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class CodeAIInstallation(Base):
    """Связка user_id ↔ GitHub App installation_id.

    Создаётся в `/github/callback` после установки App. Используется
    `service.list_user_repos`, чтобы знать какие installations принадлежат
    пользователю — без необходимости хранить placeholder-проекты.
    """

    __tablename__ = "codeai_installations"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    installation_id: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True
    )
    account_login: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class CodeAISettings(Base):
    __tablename__ = "codeai_settings"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    planning_model: Mapped[str] = mapped_column(String(255), nullable=False)
    editing_model: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
