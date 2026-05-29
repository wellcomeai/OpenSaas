"""broll module

Revision ID: 0012_broll
Revises: 0011
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0012_broll"
down_revision: Union[str, None] = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Очистка возможного частичного состояния от ранее упавшего запуска
    op.execute("DROP TABLE IF EXISTS broll_jobs CASCADE")
    op.execute("DROP TYPE IF EXISTS broll_status")

    broll_status = postgresql.ENUM(
        "pending",
        "processing",
        "done",
        "error",
        name="broll_status",
        create_type=False,
    )
    broll_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "broll_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("status", broll_status, nullable=False),
        sa.Column("scene", sa.String(length=64), nullable=True),
        sa.Column("params", sa.JSON(), nullable=True),
        sa.Column("file_path", sa.String(length=512), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_broll_jobs_user_id"), "broll_jobs", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_broll_jobs_user_id"), table_name="broll_jobs")
    op.drop_table("broll_jobs")
    op.execute("DROP TYPE IF EXISTS broll_status")
