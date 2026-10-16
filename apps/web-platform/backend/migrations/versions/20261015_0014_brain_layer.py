"""add brain layer — brain_context and brain_syntheses tables

Revision ID: 20261015_0014
Revises: 20261011_0013
Create Date: 2026-10-15
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20261015_0014"
down_revision = "20261011_0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    # ── brain_context  (Soul File key-value store) ──────────────────────────
    if not sa.inspect(bind).has_table("brain_context"):
        op.create_table(
            "brain_context",
            sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
            sa.Column("context_key", sa.String(120), nullable=False, unique=True),
            sa.Column("context_value", sa.Text(), nullable=False),
            sa.Column("description", sa.String(500), nullable=False, server_default=""),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("last_updated_by", sa.String(40), nullable=False, server_default="system"),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "idx_brain_context_key",
            "brain_context",
            ["context_key"],
            unique=True,
        )

    # ── brain_syntheses  (weekly LLM snapshot) ─────────────────────────────
    if not sa.inspect(bind).has_table("brain_syntheses"):
        op.create_table(
            "brain_syntheses",
            sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
            sa.Column("period_label", sa.String(40), nullable=False),
            sa.Column("period_start", sa.DateTime(timezone=True), nullable=False),
            sa.Column("period_end", sa.DateTime(timezone=True), nullable=False),
            sa.Column("category", sa.String(80), nullable=False, server_default="Supply Chain"),
            sa.Column("synthesis_text", sa.Text(), nullable=False),
            sa.Column("source_memory_ids", sa.Text(), nullable=False, server_default="[]"),
            sa.Column("memory_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("provider", sa.String(120), nullable=True),
            sa.Column("token_usage", sa.Integer(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "idx_brain_syntheses_period",
            "brain_syntheses",
            ["period_label"],
        )
        op.create_index(
            "idx_brain_syntheses_category",
            "brain_syntheses",
            ["category"],
        )
        op.create_index(
            "idx_brain_syntheses_created",
            "brain_syntheses",
            ["created_at"],
        )


def downgrade() -> None:
    bind = op.get_bind()

    # Drop indexes + brain_syntheses
    if sa.inspect(bind).has_table("brain_syntheses"):
        op.drop_index("idx_brain_syntheses_created", table_name="brain_syntheses")
        op.drop_index("idx_brain_syntheses_category", table_name="brain_syntheses")
        op.drop_index("idx_brain_syntheses_period", table_name="brain_syntheses")
        op.drop_table("brain_syntheses")

    # Drop indexes + brain_context
    if sa.inspect(bind).has_table("brain_context"):
        op.drop_index("idx_brain_context_key", table_name="brain_context")
        op.drop_table("brain_context")
