"""add bounded retry counter to durable agent runs

Revision ID: 20261112_0016
Revises: 20261016_0015
Create Date: 2026-11-12
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20261112_0016"
down_revision = "20261016_0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("agent_runs"):
        return
    columns = {column["name"] for column in inspector.get_columns("agent_runs")}
    if "retry_count" not in columns:
        op.add_column(
            "agent_runs",
            sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        )
        op.alter_column("agent_runs", "retry_count", server_default=None)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("agent_runs"):
        return
    columns = {column["name"] for column in inspector.get_columns("agent_runs")}
    if "retry_count" in columns:
        op.drop_column("agent_runs", "retry_count")
