"""secure brain-layer tables and align indexes with SQLAlchemy models

Revision ID: 20261016_0015
Revises: 20261015_0014
Create Date: 2026-10-16
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20261016_0015"
down_revision = "20261015_0014"
branch_labels = None
depends_on = None


def _indexes(table_name: str) -> set[str]:
    bind = op.get_bind()
    schema = "public" if bind.dialect.name == "postgresql" else None
    return {
        index["name"]
        for index in sa.inspect(bind).get_indexes(table_name, schema=schema)
    }


def _ensure_index(table_name: str, index_name: str, column_name: str) -> None:
    if index_name not in _indexes(table_name):
        op.create_index(index_name, table_name, [column_name], unique=False)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    schema = "public" if bind.dialect.name == "postgresql" else None

    if inspector.has_table("brain_context", schema=schema):
        # Replace the earlier custom index with the model-aligned index set.
        if "idx_brain_context_key" in _indexes("brain_context"):
            op.drop_index("idx_brain_context_key", table_name="brain_context")
        _ensure_index("brain_context", "ix_brain_context_id", "id")
        _ensure_index("brain_context", "ix_brain_context_context_key", "context_key")
        _ensure_index("brain_context", "ix_brain_context_is_active", "is_active")

    if inspector.has_table("brain_syntheses", schema=schema):
        for legacy_index in (
            "idx_brain_syntheses_period",
            "idx_brain_syntheses_category",
            "idx_brain_syntheses_created",
        ):
            if legacy_index in _indexes("brain_syntheses"):
                op.drop_index(legacy_index, table_name="brain_syntheses")
        _ensure_index("brain_syntheses", "ix_brain_syntheses_id", "id")
        _ensure_index("brain_syntheses", "ix_brain_syntheses_period_label", "period_label")
        _ensure_index("brain_syntheses", "ix_brain_syntheses_category", "category")
        _ensure_index("brain_syntheses", "ix_brain_syntheses_created_at", "created_at")

    # RLS and direct-client privilege revocation apply to PostgreSQL/Supabase.
    # SQLite remains useful for migration and unit-test validation.
    if bind.dialect.name == "postgresql":
        for table_name in ("brain_context", "brain_syntheses"):
            if not inspector.has_table(table_name, schema="public"):
                continue
            op.execute(f"ALTER TABLE public.{table_name} ENABLE ROW LEVEL SECURITY")
            op.execute(
                f"REVOKE ALL PRIVILEGES ON TABLE public.{table_name} "
                "FROM PUBLIC, anon, authenticated"
            )
            op.execute(
                f"GRANT ALL PRIVILEGES ON TABLE public.{table_name} "
                "TO service_role, postgres"
            )


def downgrade() -> None:
    # Deliberately preserve RLS and the restrictive grants during rollback.
    # The indexes are additive and safe to retain.
    pass
