"""codeai installations

Revision ID: 0012
Revises: 0011
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "codeai_installations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "installation_id",
            sa.String(64),
            nullable=False,
            unique=True,
        ),
        sa.Column("account_login", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_codeai_installations_user_id",
        "codeai_installations",
        ["user_id"],
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS codeai_installations CASCADE")
