"""SQLAlchemy модели модуля animations."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class AnimationJobStatus(str, enum.Enum):
    QUEUED = "queued"
    GENERATING_HTML = "generating_html"
    RENDERING = "rendering"
    ENCODING = "encoding"
    DONE = "done"
    ERROR = "error"


class AnimationJob(Base):
    __tablename__ = "animation_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # user_id nullable — модуль может работать и без привязки к юзеру,
    # но в этом проекте все запросы идут через JWT (CurrentUser).
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    duration: Mapped[int] = mapped_column(Integer, nullable=False)
    fps: Mapped[int] = mapped_column(Integer, nullable=False)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[AnimationJobStatus] = mapped_column(
        Enum(
            AnimationJobStatus,
            name="animation_job_status",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=AnimationJobStatus.QUEUED,
    )
    progress: Mapped[float] = mapped_column(
        Float, nullable=False, server_default="0"
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Сохранённый HTML — для отладки и возможного повторного рендера.
    html: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    output_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
