"""add execution metadata to agent steps

Revision ID: 20261007_0011
Revises: 20261005_0010
Create Date: 2026-10-07
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20261007_0011"
down_revision = "20261005_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("agent_steps")}
    indexes = {index["name"] for index in inspector.get_indexes("agent_steps")}

    additions = (
        ("status", sa.Column("status", sa.String(length=24), nullable=False, server_default="completed")),
        ("provider", sa.Column("provider", sa.String(length=120), nullable=True)),
        ("model", sa.Column("model", sa.String(length=160), nullable=True)),
        ("token_usage", sa.Column("token_usage", sa.Integer(), nullable=True)),
        ("output_json", sa.Column("output_json", sa.Text(), nullable=False, server_default="{}")),
        ("error", sa.Column("error", sa.Text(), nullable=True)),
    )
    added = set()
    for name, column in additions:
        if name not in columns:
            op.add_column("agent_steps", column)
            added.add(name)

    if "ix_agent_steps_status" not in indexes:
        op.create_index("ix_agent_steps_status", "agent_steps", ["status"], unique=False)

    # SQLite cannot ALTER COLUMN to drop a default. PostgreSQL can, and the
    # production schema should not retain migration-time defaults.
    if bind.dialect.name != "sqlite":
        if "status" in added:
            op.alter_column("agent_steps", "status", server_default=None)
        if "output_json" in added:
            op.alter_column("agent_steps", "output_json", server_default=None)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("agent_steps")}
    indexes = {index["name"] for index in inspector.get_indexes("agent_steps")}

    if "ix_agent_steps_status" in indexes:
        op.drop_index("ix_agent_steps_status", table_name="agent_steps")

    for name in ("error", "output_json", "token_usage", "model", "provider", "status"):
        if name in columns:
            op.drop_column("agent_steps", name)
