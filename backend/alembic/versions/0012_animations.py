"""animations module

Revision ID: 0012
Revises: 0011
"""
from typing import Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Очистка возможного частичного состояния от ранее упавшего запуска.
    op.execute("DROP TABLE IF EXISTS animation_jobs CASCADE")

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
    bind = op.get_bind()
    sa.Enum(
        "queued",
        "generating_html",
        "rendering",
        "encoding",
        "done",
        "error",
        name="animation_job_status",
    ).create(bind, checkfirst=True)

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
        sa.Column(
            "progress", sa.Float(), nullable=False, server_default="0"
        ),
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
    op.execute("DROP TABLE IF EXISTS animation_jobs CASCADE")
    op.execute("DROP TYPE IF EXISTS animation_job_status")
