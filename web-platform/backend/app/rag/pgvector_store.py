from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.orm import Session

from .embeddings import embedding_to_json


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
