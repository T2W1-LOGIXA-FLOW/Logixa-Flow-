from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from .. import models
from .chunking import chunk_text
from .embeddings import embed_text, embedding_to_json
from .pgvector_store import pgvector_column_exists, store_embedding_vector

logger = logging.getLogger(__name__)


def _replace_chunks(
    db: Session,
    *,
    source_type: str,
    source_id: str,
    title: str,
    chunks: list[str],
) -> int:
    db.query(models.DocumentEmbedding).filter(
        models.DocumentEmbedding.source_type == source_type,
        models.DocumentEmbedding.source_id == source_id,
    ).delete(synchronize_session=False)
    created = 0
    for index, chunk in enumerate(chunks):
        vector, model_name = embed_text(chunk)
        row = models.DocumentEmbedding(
            source_type=source_type,
            source_id=source_id,
            chunk_index=index,
            title=title[:255],
            content=chunk,
            embedding_json=embedding_to_json(vector),
            embedding_model=model_name,
        )
        db.add(row)
        if pgvector_column_exists(db):
            db.flush()
            store_embedding_vector(db, row.id, vector)
        created += 1
    db.commit()
    return created


def ingest_intelligence_source(db: Session, source: models.IntelligenceSource) -> int:
    body = "\n\n".join(part for part in [source.title, source.content_text, source.notes, source.url or ""] if part)
    chunks = chunk_text(body)
    if not chunks:
        return 0
    count = _replace_chunks(
        db,
        source_type="intelligence_source",
        source_id=str(source.id),
        title=source.title,
        chunks=chunks,
    )
    logger.info("RAG ingested source %s (%s chunks)", source.id, count)
    return count


def ingest_brain_memory(db: Session, memory: models.AiMemoryBrain) -> int:
    body = "\n\n".join(part for part in [memory.source_title, memory.summary, memory.content, memory.prompt] if part)
    chunks = chunk_text(body)
    if not chunks:
        return 0
    return _replace_chunks(
        db,
        source_type="brain",
        source_id=str(memory.id),
        title=memory.source_title,
        chunks=chunks,
    )


def ingest_all_sources(db: Session, limit: int = 200) -> dict[str, int]:
    sources = db.query(models.IntelligenceSource).order_by(models.IntelligenceSource.updated_at.desc()).limit(limit).all()
    total_chunks = 0
    for source in sources:
        total_chunks += ingest_intelligence_source(db, source)
    memories = db.query(models.AiMemoryBrain).order_by(models.AiMemoryBrain.updated_at.desc()).limit(limit).all()
    for memory in memories:
        total_chunks += ingest_brain_memory(db, memory)
    return {"sources": len(sources), "brain_items": len(memories), "chunks": total_chunks}
