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

    # Очистка возможного частичного состояния от ранее упавшего запуска
    op.execute("DROP TABLE IF EXISTS codeai_messages CASCADE")
    op.execute("DROP TABLE IF EXISTS codeai_sessions CASCADE")
    op.execute("DROP TABLE IF EXISTS codeai_chunks CASCADE")
    op.execute("DROP TABLE IF EXISTS codeai_settings CASCADE")
    op.execute("DROP TABLE IF EXISTS codeai_projects CASCADE")

    # Создаём enum типы ОДИН раз с checkfirst — а в колонках ниже
    # используем postgresql.ENUM(..., create_type=False), чтобы
    # create_table не пытался создать тип повторно.
    session_status = postgresql.ENUM(
        "idle",
        "planning",
        "awaiting_confirmation",
        "executing",
        "done",
        "error",
        name="codeai_session_status",
        create_type=False,
    )
    message_role = postgresql.ENUM(
        "user", "assistant", "system",
        name="codeai_message_role",
        create_type=False,
    )
    message_type = postgresql.ENUM(
        "chat", "plan", "status", "diff",
        name="codeai_message_type",
        create_type=False,
    )
    bind = op.get_bind()
    sa.Enum(
        "idle",
        "planning",
        "awaiting_confirmation",
        "executing",
        "done",
        "error",
        name="codeai_session_status",
    ).create(bind, checkfirst=True)
    sa.Enum(
        "user", "assistant", "system", name="codeai_message_role"
    ).create(bind, checkfirst=True)
    sa.Enum(
        "chat", "plan", "status", "diff", name="codeai_message_type"
    ).create(bind, checkfirst=True)

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
    op.execute("DROP TABLE IF EXISTS codeai_messages CASCADE")
    op.execute("DROP TABLE IF EXISTS codeai_sessions CASCADE")
    op.execute("DROP INDEX IF EXISTS codeai_chunks_embedding_ivfflat")
    op.execute("DROP TABLE IF EXISTS codeai_chunks CASCADE")
    op.execute("DROP TABLE IF EXISTS codeai_settings CASCADE")
    op.execute("DROP TABLE IF EXISTS codeai_projects CASCADE")
    op.execute("DROP TYPE IF EXISTS codeai_message_type")
    op.execute("DROP TYPE IF EXISTS codeai_message_role")
    op.execute("DROP TYPE IF EXISTS codeai_session_status")
