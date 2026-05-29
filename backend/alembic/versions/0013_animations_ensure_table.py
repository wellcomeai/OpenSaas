"""ensure animations table exists (idempotent recovery)

Revision ID: 0013
Revises: 0012

Эта миграция чинит ситуацию, когда БД помечена ревизией 0012, но таблица
`animation_jobs` физически отсутствует. Такое происходит, если ранее
срабатывала аварийная ветка в start.sh (`alembic stamp head --purge` +
`alembic upgrade head`): stamp помечает БД как находящуюся на head, но НЕ
выполняет SQL миграции, поэтому таблица не создаётся.

Миграция полностью идемпотентна: на здоровой БД (таблица уже есть) она
ничего не делает, на сломанной — досоздаёт enum, таблицу и индекс.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

revision: str = "0013"
down_revision: Union[str, None] = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if inspector.has_table("animation_jobs"):
        # Таблица уже существует (нормальный путь через 0012) — no-op.
        return

    # Enum мог быть создан 0012 даже если таблицы нет — создаём с checkfirst.
    sa.Enum(
        "queued",
        "generating_html",
        "rendering",
        "encoding",
        "done",
        "error",
        name="animation_job_status",
    ).create(bind, checkfirst=True)

    job_status = postgresql.ENUM(
        "queued",
        "generating_html",
        "rendering",
        "encoding",
        "done",
        "error",
        name="animation_job_status",
        create_type=False,
    )

    op.create_table(
        "animation_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("duration", sa.Integer(), nullable=False),
        sa.Column("fps", sa.Integer(), nullable=False),
        sa.Column("width", sa.Integer(), nullable=False),
        sa.Column("height", sa.Integer(), nullable=False),
        sa.Column("status", job_status, nullable=False, server_default="queued"),
        sa.Column("progress", sa.Float(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("html", sa.Text(), nullable=True),
        sa.Column("output_path", sa.String(1024), nullable=True),
        sa.Column("output_url", sa.String(1024), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_animation_jobs_user_id", "animation_jobs", ["user_id"]
    )


def downgrade() -> None:
    # 0013 — только восстановление; откат оставляем за 0012.
    pass
