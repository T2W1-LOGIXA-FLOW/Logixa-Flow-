"""document embeddings for RAG

Revision ID: 20260602_0002
Revises: 20260602_0001
Create Date: 2026-06-02
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260602_0002"
down_revision = "20260602_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "document_embeddings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source_type", sa.String(length=40), nullable=False),
        sa.Column("source_id", sa.String(length=64), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding_json", sa.Text(), nullable=False),
        sa.Column("embedding_model", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_document_embeddings_source_type", "document_embeddings", ["source_type"])
    op.create_index("ix_document_embeddings_source_id", "document_embeddings", ["source_id"])
    op.create_index("ix_document_embeddings_created_at", "document_embeddings", ["created_at"])


def downgrade() -> None:
    op.drop_table("document_embeddings")
