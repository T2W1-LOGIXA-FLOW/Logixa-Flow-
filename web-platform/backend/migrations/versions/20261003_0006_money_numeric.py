"""Convert monetary float columns to PostgreSQL numeric.

Revision ID: 20261003_0006
Revises: 20261003_0005
"""

from alembic import op
import sqlalchemy as sa


revision = "20261003_0006"
down_revision = "20261003_0005"
branch_labels = None
depends_on = None


MONEY_COLUMNS = (
    ("ai_memory_brain", "cost_estimate", sa.Numeric(18, 8)),
    ("agent_runs", "cost_estimate", sa.Numeric(18, 8)),
    ("chat_messages", "cost_estimate", sa.Numeric(18, 8)),
    ("api_usage_logs", "cost", sa.Numeric(18, 8)),
    ("project_revenues", "estimated_revenue", sa.Numeric(18, 6)),
    ("project_revenues", "estimated_cost", sa.Numeric(18, 6)),
    ("project_revenues", "actual_revenue", sa.Numeric(18, 6)),
    ("project_revenues", "actual_cost", sa.Numeric(18, 6)),
    ("expense_categories", "budget", sa.Numeric(18, 6)),
    ("company_budgets", "total_budget", sa.Numeric(18, 6)),
    ("company_budgets", "spent_amount", sa.Numeric(18, 6)),
)


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for table, column, numeric_type in MONEY_COLUMNS:
        op.alter_column(
            table,
            column,
            type_=numeric_type,
            existing_type=sa.Float(),
            postgresql_using=f"{column}::numeric",
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for table, column, numeric_type in reversed(MONEY_COLUMNS):
        op.alter_column(
            table,
            column,
            type_=sa.Float(),
            existing_type=numeric_type,
            postgresql_using=f"{column}::double precision",
        )
