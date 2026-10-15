"""convert monetary float columns to numeric/decimal

Revision ID: 20261005_0007
Revises: 20261003_0006
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20261005_0007"
down_revision = "20261003_0006"
branch_labels = None
depends_on = None


MONEY_COLUMNS = {
    "ai_memory_brain": ("cost_estimate",),
    "agent_runs": ("cost_estimate",),
    "api_usage_logs": ("cost",),
    "chat_messages": ("cost_estimate",),
    "company_budgets": ("total_budget", "spent_amount"),
    "expense_categories": ("budget",),
    "project_revenues": (
        "estimated_revenue",
        "estimated_cost",
        "actual_revenue",
        "actual_cost",
    ),
}


def _table_names() -> set[str]:
    bind = op.get_bind()
    schema = "public" if bind.dialect.name == "postgresql" else None
    return set(sa.inspect(bind).get_table_names(schema=schema))


def _column_names(table: str) -> set[str]:
    bind = op.get_bind()
    schema = "public" if bind.dialect.name == "postgresql" else None
    return {column["name"] for column in sa.inspect(bind).get_columns(table, schema=schema)}


def _alter_money_type(table: str, column: str, target_type: sa.types.TypeEngine) -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.alter_column(
            table,
            column,
            existing_type=sa.Float(),
            type_=target_type,
            postgresql_using=f'"{column}"::numeric(18,6)',
        )
        return

    with op.batch_alter_table(table) as batch_op:
        batch_op.alter_column(
            column,
            existing_type=sa.Float(),
            type_=target_type,
        )


def upgrade() -> None:
    target_type = sa.Numeric(18, 6, asdecimal=True)
    tables = _table_names()

    for table, columns in MONEY_COLUMNS.items():
        if table not in tables:
            continue
        available = _column_names(table)
        for column in columns:
            if column in available:
                _alter_money_type(table, column, target_type)


def downgrade() -> None:
    float_type = sa.Float()
    tables = _table_names()

    for table, columns in MONEY_COLUMNS.items():
        if table not in tables:
            continue
        available = _column_names(table)
        for column in columns:
            if column not in available:
                continue
            bind = op.get_bind()
            if bind.dialect.name == "postgresql":
                op.alter_column(
                    table,
                    column,
                    existing_type=sa.Numeric(18, 6, asdecimal=True),
                    type_=float_type,
                    postgresql_using=f'"{column}"::double precision',
                )
            else:
                with op.batch_alter_table(table) as batch_op:
                    batch_op.alter_column(
                        column,
                        existing_type=sa.Numeric(18, 6, asdecimal=True),
                        type_=float_type,
                    )
