"""codeai module

Revision ID: 0011
Revises: 0010
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "codeai_projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("github_installation_id", sa.String(64), nullable=False),
        sa.Column("repo_full_name", sa.String(255), nullable=False),
        sa.Column(
            "repo_default_branch",
            sa.String(255),
            nullable=False,
            server_default="main",
        ),
        sa.Column(
            "is_indexed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("indexed_at", sa.DateTime(timezone=True), nullable=True),
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
        "ix_codeai_projects_user_id", "codeai_projects", ["user_id"]
    )

    op.create_table(
        "codeai_chunks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("codeai_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("file_path", sa.String(1024), nullable=False),
        sa.Column("start_line", sa.Integer(), nullable=False),
        sa.Column("end_line", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "embedding",
            sa.dialects.postgresql.ARRAY(sa.Float()),  # placeholder; replaced below
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    # Заменяем embedding на pgvector
    op.execute("ALTER TABLE codeai_chunks DROP COLUMN embedding")
    op.execute("ALTER TABLE codeai_chunks ADD COLUMN embedding vector(1536)")
    op.create_index(
        "ix_codeai_chunks_project_id", "codeai_chunks", ["project_id"]
    )
    op.execute(
        "CREATE INDEX codeai_chunks_embedding_ivfflat "
        "ON codeai_chunks USING ivfflat (embedding vector_cosine_ops) "
        "WITH (lists = 100)"
    )

    session_status = sa.Enum(
        "idle",
        "planning",
        "awaiting_confirmation",
        "executing",
        "done",
        "error",
        name="codeai_session_status",
    )
    session_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "codeai_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("codeai_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "status",
            session_status,
            nullable=False,
            server_default="idle",
        ),
        sa.Column("task", sa.Text(), nullable=False),
        sa.Column("plan", sa.JSON(), nullable=True),
        sa.Column("pr_url", sa.String(512), nullable=True),
        sa.Column("branch_name", sa.String(255), nullable=True),
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
        "ix_codeai_sessions_project_id", "codeai_sessions", ["project_id"]
    )

    message_role = sa.Enum(
        "user", "assistant", "system", name="codeai_message_role"
    )
    message_role.create(op.get_bind(), checkfirst=True)
    message_type = sa.Enum(
        "chat", "plan", "status", "diff", name="codeai_message_type"
    )
    message_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "codeai_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("codeai_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", message_role, nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "message_type",
            message_type,
            nullable=False,
            server_default="chat",
        ),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_codeai_messages_session_id", "codeai_messages", ["session_id"]
    )

    op.create_table(
        "codeai_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("planning_model", sa.String(255), nullable=False),
        sa.Column("editing_model", sa.String(255), nullable=False),
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
        "ix_codeai_settings_user_id", "codeai_settings", ["user_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_codeai_settings_user_id", table_name="codeai_settings")
    op.drop_table("codeai_settings")

    op.drop_index("ix_codeai_messages_session_id", table_name="codeai_messages")
    op.drop_table("codeai_messages")
    sa.Enum(name="codeai_message_type").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="codeai_message_role").drop(op.get_bind(), checkfirst=True)

    op.drop_index("ix_codeai_sessions_project_id", table_name="codeai_sessions")
    op.drop_table("codeai_sessions")
    sa.Enum(name="codeai_session_status").drop(op.get_bind(), checkfirst=True)

    op.execute("DROP INDEX IF EXISTS codeai_chunks_embedding_ivfflat")
    op.drop_index("ix_codeai_chunks_project_id", table_name="codeai_chunks")
    op.drop_table("codeai_chunks")

    op.drop_index("ix_codeai_projects_user_id", table_name="codeai_projects")
    op.drop_table("codeai_projects")
