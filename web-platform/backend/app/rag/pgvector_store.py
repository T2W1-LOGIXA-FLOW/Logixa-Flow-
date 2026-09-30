from __future__ import annotations

import logging

from sqlalchemy import text
from sqlalchemy.orm import Session

from .embeddings import EMBEDDING_DIMENSIONS, embedding_to_json

logger = logging.getLogger(__name__)


def is_postgres(db: Session) -> bool:
    bind = db.get_bind()
    return bind.dialect.name == "postgresql"


def pgvector_column_exists(db: Session) -> bool:
    if not is_postgres(db):
        return False
    try:
        exists = db.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'document_embeddings'
                  AND column_name = 'embedding'
                LIMIT 1
                """
            )
        ).first()
        return exists is not None
    except Exception:
        return False


def pgvector_enabled(db: Session) -> bool:
    if not pgvector_column_exists(db):
        return False
    try:
        db.execute(text("SELECT 1 FROM pg_extension WHERE extname = 'vector'"))
        return True
    except Exception:
        return False


def store_embedding_vector(db: Session, row_id: int, vector: list[float]) -> None:
    if not pgvector_column_exists(db):
        return
    payload = embedding_to_json(vector)
    db.execute(
        text("UPDATE document_embeddings SET embedding = CAST(:payload AS vector) WHERE id = :row_id"),
        {"payload": payload, "row_id": row_id},
    )


def similarity_search_pgvector(
    db: Session,
    query_vector: list[float],
    *,
    top_k: int,
    model_name: str,
) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT
                source_type,
                source_id,
                title,
                content,
                embedding_model,
                1 - (embedding <=> CAST(:query_vec AS vector)) AS score
            FROM document_embeddings
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> CAST(:query_vec AS vector)
            LIMIT :limit
            """
        ),
        {"query_vec": embedding_to_json(query_vector), "limit": top_k},
    ).mappings().all()

    output: list[dict] = []
    for row in rows:
        output.append(
            {
                "score": round(float(row["score"]), 4),
                "source_type": row["source_type"],
                "source_id": row["source_id"],
                "title": row["title"],
                "content": (row["content"] or "")[:1200],
                "embedding_model": row["embedding_model"] or model_name,
            }
        )
    return output


def ensure_pgvector_schema(db: Session) -> dict[str, str | bool]:
    """Best-effort pgvector readiness check for Postgres hosts (Neon/Supabase)."""
    if not is_postgres(db):
        return {"enabled": False, "reason": "not_postgresql"}

    try:
        db.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.warning("Could not enable pgvector extension: %s", exc)
        return {"enabled": False, "reason": f"extension_error:{exc.__class__.__name__}"}

    if not pgvector_column_exists(db):
        try:
            db.execute(
                text(
                    f"ALTER TABLE document_embeddings ADD COLUMN IF NOT EXISTS "
                    f"embedding vector({EMBEDDING_DIMENSIONS})"
                )
            )
            db.execute(
                text(
                    """
                    UPDATE document_embeddings
                    SET embedding = CAST(embedding_json AS vector)
                    WHERE embedding IS NULL
                      AND embedding_json IS NOT NULL
                      AND embedding_json != ''
                    """
                )
            )
            db.execute(
                text(
                    """
                    CREATE INDEX IF NOT EXISTS ix_document_embeddings_embedding_hnsw
                    ON document_embeddings USING hnsw (embedding vector_cosine_ops)
                    """
                )
            )
            db.commit()
        except Exception as exc:
            db.rollback()
            logger.warning("Could not add pgvector embedding column: %s", exc)
            return {"enabled": False, "reason": f"column_error:{exc.__class__.__name__}"}

    return {"enabled": pgvector_enabled(db), "reason": "ok" if pgvector_enabled(db) else "extension_missing"}
