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
    op.add_column("agent_steps", sa.Column("status", sa.String(length=24), nullable=False, server_default="completed"))
    op.add_column("agent_steps", sa.Column("provider", sa.String(length=120), nullable=True))
    op.add_column("agent_steps", sa.Column("model", sa.String(length=160), nullable=True))
    op.add_column("agent_steps", sa.Column("token_usage", sa.Integer(), nullable=True))
    op.add_column("agent_steps", sa.Column("output_json", sa.Text(), nullable=False, server_default="{}"))
    op.add_column("agent_steps", sa.Column("error", sa.Text(), nullable=True))
    # SQLite cannot ALTER COLUMN to drop a default. PostgreSQL can, and the\n    # production schema should not retain the migration-time defaults.\n    if op.get_bind().dialect.name != "sqlite":\n        op.alter_column("agent_steps", "status", server_default=None)\n        op.alter_column("agent_steps", "output_json", server_default=None)\n

def downgrade() -> None:
    op.drop_column("agent_steps", "error")
    op.drop_column("agent_steps", "output_json")
    op.drop_column("agent_steps", "token_usage")
    op.drop_column("agent_steps", "model")
    op.drop_column("agent_steps", "provider")
    op.drop_column("agent_steps", "status")
