"""add versioned Voyage 512-dimensional RAG embeddings

Revision ID: 20261011_0013
Revises: 20261008_0012
Create Date: 2026-10-11
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20261011_0013"
down_revision = "20261008_0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    op.add_column("document_embeddings", sa.Column("embedding_v2_json", sa.Text(), nullable=True))
    op.add_column("document_embeddings", sa.Column("embedding_v2_model", sa.String(length=120), nullable=True))
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
        op.execute("ALTER TABLE document_embeddings ADD COLUMN embedding_v2 vector(512)")
        try:
            op.execute(
                """
                CREATE INDEX IF NOT EXISTS ix_document_embeddings_embedding_v2_hnsw
                ON document_embeddings USING hnsw (embedding_v2 vector_cosine_ops)
                """
            )
        except Exception:
            op.execute(
                """
                CREATE INDEX IF NOT EXISTS ix_document_embeddings_embedding_v2_ivfflat
                ON document_embeddings USING ivfflat (embedding_v2 vector_cosine_ops)
                """
            )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_document_embeddings_embedding_v2_hnsw")
        op.execute("DROP INDEX IF EXISTS ix_document_embeddings_embedding_v2_ivfflat")
        op.execute("ALTER TABLE document_embeddings DROP COLUMN IF EXISTS embedding_v2")
    op.drop_column("document_embeddings", "embedding_v2_model")
    op.drop_column("document_embeddings", "embedding_v2_json")
