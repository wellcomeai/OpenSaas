"""codeai single model + tool message types

Revision ID: 0013
Revises: 0012
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0013"
down_revision: Union[str, None] = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Settings: planning_model → model, drop editing_model.
    op.alter_column(
        "codeai_settings",
        "planning_model",
        new_column_name="model",
    )
    op.drop_column("codeai_settings", "editing_model")

    # codeai_message_type: add tool_use / tool_result.
    op.execute("ALTER TYPE codeai_message_type ADD VALUE IF NOT EXISTS 'tool_use'")
    op.execute("ALTER TYPE codeai_message_type ADD VALUE IF NOT EXISTS 'tool_result'")


def downgrade() -> None:
    op.alter_column(
        "codeai_settings",
        "model",
        new_column_name="planning_model",
    )
    op.add_column(
        "codeai_settings",
        sa.Column(
            "editing_model",
            sa.String(255),
            nullable=False,
            server_default="deepseek/deepseek-chat",
        ),
    )
    # Enum values cannot easily be dropped — leave them.
