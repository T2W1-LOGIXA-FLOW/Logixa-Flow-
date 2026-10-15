"""add stored file metadata

Revision ID: 20261005_0010
Revises: 20261005_0009
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20261005_0010"
down_revision = "20261005_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names(schema="public" if bind.dialect.name == "postgresql" else None))
    if "stored_files" in tables:
        return

    op.create_table(
        "stored_files",
        sa.Column("id", sa.String(length=80), nullable=False),
        sa.Column("original_filename", sa.String(length=500), nullable=False),
        sa.Column("storage_backend", sa.String(length=40), nullable=False),
        sa.Column("storage_class", sa.String(length=40), nullable=False),
        sa.Column("content_type", sa.String(length=160), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("object_key", sa.String(length=1000), nullable=False),
        sa.Column("url", sa.String(length=2000), nullable=True),
        sa.Column("owner_id", sa.String(length=255), nullable=True),
        sa.Column("is_export", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    for name, column in (
        ("ix_stored_files_id", "id"),
        ("ix_stored_files_storage_backend", "storage_backend"),
        ("ix_stored_files_storage_class", "storage_class"),
        ("ix_stored_files_object_key", "object_key"),
        ("ix_stored_files_owner_id", "owner_id"),
        ("ix_stored_files_is_export", "is_export"),
        ("ix_stored_files_created_at", "created_at"),
    ):
        op.create_index(name, "stored_files", [column], unique=False)

    if bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE public.stored_files ENABLE ROW LEVEL SECURITY")
        op.execute("REVOKE ALL PRIVILEGES ON TABLE public.stored_files FROM PUBLIC")
        op.execute("REVOKE ALL PRIVILEGES ON TABLE public.stored_files FROM anon")
        op.execute("REVOKE ALL PRIVILEGES ON TABLE public.stored_files FROM authenticated")
        op.execute("GRANT ALL PRIVILEGES ON TABLE public.stored_files TO service_role")


def downgrade() -> None:
    for name in (
        "ix_stored_files_created_at",
        "ix_stored_files_is_export",
        "ix_stored_files_owner_id",
        "ix_stored_files_object_key",
        "ix_stored_files_storage_class",
        "ix_stored_files_storage_backend",
        "ix_stored_files_id",
    ):
        op.drop_index(name, table_name="stored_files")
    op.drop_table("stored_files")
