"""Add durable workflow queue claim metadata.

Revision ID: 20261003_0005
Revises: 20260902_0004
"""

from alembic import op
import sqlalchemy as sa


revision = "20261003_0005"
down_revision = "20260902_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "scheduled_workflow_jobs",
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "scheduled_workflow_jobs",
        sa.Column("last_claimed_by", sa.String(length=120), nullable=True),
    )
    op.add_column(
        "scheduled_workflow_jobs",
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_scheduled_workflow_jobs_last_claimed_by",
        "scheduled_workflow_jobs",
        ["last_claimed_by"],
        unique=False,
    )
    op.create_index(
        "ix_scheduled_workflow_jobs_claimed_at",
        "scheduled_workflow_jobs",
        ["claimed_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_scheduled_workflow_jobs_claimed_at", table_name="scheduled_workflow_jobs")
    op.drop_index("ix_scheduled_workflow_jobs_last_claimed_by", table_name="scheduled_workflow_jobs")
    op.drop_column("scheduled_workflow_jobs", "claimed_at")
    op.drop_column("scheduled_workflow_jobs", "last_claimed_by")
    op.drop_column("scheduled_workflow_jobs", "attempt_count")
