"""add style column to animation_jobs (B-roll presets)

Revision ID: 0014
Revises: 0013

Добавляет колонку `style` в `animation_jobs` — пресет визуального стиля
B-roll (см. modules.animations.config.BROLL_STYLES). Идемпотентна: если
колонка уже есть, ничего не делает.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "0014"
down_revision: Union[str, None] = "0013"
branch_labels = None
depends_on = None


def _has_column(table: str, column: str) -> bool:
    inspector = inspect(op.get_bind())
    if not inspector.has_table(table):
        return False
    return any(col["name"] == column for col in inspector.get_columns(table))


def upgrade() -> None:
    if _has_column("animation_jobs", "style"):
        return
    op.add_column(
        "animation_jobs",
        sa.Column(
            "style",
            sa.String(32),
            nullable=False,
            server_default="auto",
        ),
    )


def downgrade() -> None:
    if _has_column("animation_jobs", "style"):
        op.drop_column("animation_jobs", "style")
