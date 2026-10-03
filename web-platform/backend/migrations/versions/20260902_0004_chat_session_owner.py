"""add nullable owner identity to chat sessions

Revision ID: 20260902_0004
Revises: 20260606_0003
Create Date: 2026-09-02
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260902_0004"
down_revision = "20260606_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("chat_sessions"):
        return

    columns = {column["name"] for column in inspector.get_columns("chat_sessions")}
    if "owner_id" not in columns:
        op.add_column("chat_sessions", sa.Column("owner_id", sa.String(length=255), nullable=True))
    indexes = {index["name"] for index in inspector.get_indexes("chat_sessions")}
    if "ix_chat_sessions_owner_id" not in indexes:
        op.create_index("ix_chat_sessions_owner_id", "chat_sessions", ["owner_id"])
    if "deleted_at" not in columns:
        op.add_column("chat_sessions", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    if "deleted_by" not in columns:
        op.add_column("chat_sessions", sa.Column("deleted_by", sa.String(length=255), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    indexes = {index["name"] for index in inspector.get_indexes("chat_sessions")}
    if "ix_chat_sessions_owner_id" in indexes:
        op.drop_index("ix_chat_sessions_owner_id", table_name="chat_sessions")
    columns = {column["name"] for column in inspector.get_columns("chat_sessions")}
    if "deleted_by" in columns:
        op.drop_column("chat_sessions", "deleted_by")
    if "deleted_at" in columns:
        op.drop_column("chat_sessions", "deleted_at")
    if "owner_id" in columns:
        op.drop_column("chat_sessions", "owner_id")
