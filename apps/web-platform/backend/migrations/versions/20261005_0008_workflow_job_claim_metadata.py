"""add workflow job claim metadata

Revision ID: 20261005_0008
Revises: 20261005_0007
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20261005_0008"
down_revision = "20261005_0007"
branch_labels = None
depends_on = None


def _column_names(table: str) -> set[str]:
    bind = op.get_bind()
    schema = "public" if bind.dialect.name == "postgresql" else None
    return {column["name"] for column in sa.inspect(bind).get_columns(table, schema=schema)}


def upgrade() -> None:
    columns = _column_names("scheduled_workflow_jobs")
    if "claimed_by" not in columns:
        op.add_column(
            "scheduled_workflow_jobs",
            sa.Column("claimed_by", sa.String(length=120), nullable=True),
        )
    if "claimed_at" not in columns:
        op.add_column(
            "scheduled_workflow_jobs",
            sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
        )

    indexes = {
        index["name"]
        for index in sa.inspect(op.get_bind()).get_indexes(
            "scheduled_workflow_jobs",
            schema="public" if op.get_bind().dialect.name == "postgresql" else None,
        )
    }
    if "ix_scheduled_workflow_jobs_claimed_by" not in indexes:
        op.create_index(
            "ix_scheduled_workflow_jobs_claimed_by",
            "scheduled_workflow_jobs",
            ["claimed_by"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    schema = "public" if bind.dialect.name == "postgresql" else None
    indexes = {
        index["name"]
        for index in sa.inspect(bind).get_indexes("scheduled_workflow_jobs", schema=schema)
    }
    if "ix_scheduled_workflow_jobs_claimed_by" in indexes:
        op.drop_index("ix_scheduled_workflow_jobs_claimed_by", table_name="scheduled_workflow_jobs")
    columns = _column_names("scheduled_workflow_jobs")
    if "claimed_at" in columns:
        op.drop_column("scheduled_workflow_jobs", "claimed_at")
    if "claimed_by" in columns:
        op.drop_column("scheduled_workflow_jobs", "claimed_by")
