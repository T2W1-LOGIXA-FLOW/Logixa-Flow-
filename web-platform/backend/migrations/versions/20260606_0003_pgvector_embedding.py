"""add pgvector embedding column

Revision ID: 20260606_0003
Revises: 20260602_0002
Create Date: 2026-06-06
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260606_0003"
down_revision = "20260602_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("document_embeddings")}
    if "embedding" not in columns:
        op.execute("ALTER TABLE document_embeddings ADD COLUMN embedding vector(768)")

    op.execute(
        """
        UPDATE document_embeddings
        SET embedding = CAST(embedding_json AS vector)
        WHERE embedding IS NULL
          AND embedding_json IS NOT NULL
          AND embedding_json != ''
        """
    )

    try:
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS ix_document_embeddings_embedding_hnsw
            ON document_embeddings USING hnsw (embedding vector_cosine_ops)
            """
        )
    except Exception:
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS ix_document_embeddings_embedding_ivfflat
            ON document_embeddings USING ivfflat (embedding vector_cosine_ops)
            """
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute("DROP INDEX IF EXISTS ix_document_embeddings_embedding_hnsw")
    op.execute("ALTER TABLE document_embeddings DROP COLUMN IF EXISTS embedding")
