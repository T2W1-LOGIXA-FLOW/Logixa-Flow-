from __future__ import annotations

import logging
import os

from sqlalchemy.orm import Session

from .. import models
from .chunking import chunk_text
from .embeddings import embed_text, embed_text_v2, embedding_to_json
from .pgvector_store import pgvector_column_exists, store_embedding_vector, store_embedding_vector_v2

logger = logging.getLogger(__name__)


def _replace_chunks(
    db: Session,
    *,
    source_type: str,
    source_id: str,
    title: str,
    chunks: list[str],
) -> int:
    use_v2 = os.getenv("RAG_EMBEDDING_VERSION", "1").strip() == "2"

    # Generate every vector before deleting existing chunks. A provider failure must
    # not leave the source partially ingested or let error telemetry commit a delete.
    prepared: list[tuple[str, list[float] | None, str, list[float] | None, str | None]] = []
    for chunk in chunks:
        vector_v2 = None
        model_v2 = None
        if use_v2:
            # Voyage v2 is the active provider for this version. Do not call the
            # legacy provider (which may be rate-limited) or synthesize a fallback
            # vector; new rows are explicitly v2-only until a valid legacy vector
            # can be backfilled.
            vector = None
            model_name = "v2-only"
            vector_v2, model_v2 = embed_text_v2(chunk)
        else:
            vector, model_name = embed_text(chunk)
            if model_name == "hash:fallback":
                raise RuntimeError(
                    "Semantic embedding provider unavailable; refusing to persist hash fallback vectors"
                )
        prepared.append((chunk, vector, model_name, vector_v2, model_v2))

    db.query(models.DocumentEmbedding).filter(
        models.DocumentEmbedding.source_type == source_type,
        models.DocumentEmbedding.source_id == source_id,
    ).delete(synchronize_session=False)
    for index, (chunk, vector, model_name, vector_v2, model_v2) in enumerate(prepared):
        row = models.DocumentEmbedding(
            source_type=source_type,
            source_id=source_id,
            chunk_index=index,
            title=title[:255],
            content=chunk,
            embedding_json=embedding_to_json(vector) if vector is not None else "[]",
            embedding_model=model_name,
            embedding_v2_json=embedding_to_json(vector_v2) if vector_v2 is not None else None,
            embedding_v2_model=model_v2,
        )
        db.add(row)
        if pgvector_column_exists(db):
            db.flush()
            if vector is not None:
                store_embedding_vector(db, row.id, vector)
            if vector_v2 is not None:
                store_embedding_vector_v2(db, row.id, vector_v2)
    db.commit()
    return len(prepared)


class UnindexableRSSContentError(ValueError):
    """An RSS discovery item has not yet yielded a usable article body."""


def ingest_intelligence_source(db: Session, source: models.IntelligenceSource) -> int:
    # RSS title, publisher, URL, and short feed descriptions are discovery metadata,
    # not article evidence. Index only extracted article text for RSS sources so a
    # metadata-only feed item cannot masquerade as grounded RAG knowledge.
    if source.source_type == "rss":
        body = (source.content_text or "").strip()
        if len(body) < 200:
            raise UnindexableRSSContentError(
                "RSS source has no extracted article body (minimum 200 characters); "
                "metadata-only RSS records cannot be indexed"
            )
    else:
        body = "\n\n".join(
            part for part in [source.title, source.content_text, source.notes, source.url or ""] if part
        )
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
    indexed_sources = 0
    failed_sources = 0
    for source in sources:
        try:
            source.indexing_status = "processing"
            source.indexing_error = None
            db.commit()

            chunks = ingest_intelligence_source(db, source)
            if chunks == 0:
                raise ValueError("Source contains no indexable content")
            total_chunks += chunks
            indexed_sources += 1

            source.indexing_status = "indexed"
            source.indexed_at = models.utc_now()
            source.indexing_error = None
            db.commit()
        except UnindexableRSSContentError as exc:
            # A feed discovery item without an extracted body is an expected,
            # item-level condition. Record it and continue with other sources.
            db.rollback()
            failed_source = (
                db.query(models.IntelligenceSource)
                .filter(models.IntelligenceSource.id == source.id)
                .first()
            )
            if failed_source is not None:
                failed_source.indexing_status = "failed"
                failed_source.indexing_error = str(exc)[:1000]
                db.commit()
                failed_sources += 1
        except Exception as exc:
            # Provider, database, and unexpected failures must remain fail-closed.
            # Record operational state, then propagate so callers see the outage.
            db.rollback()
            failed_source = (
                db.query(models.IntelligenceSource)
                .filter(models.IntelligenceSource.id == source.id)
                .first()
            )
            if failed_source is not None:
                failed_source.indexing_status = "failed"
                failed_source.indexing_error = str(exc)[:1000]
                db.commit()
            raise
    memories = (
        db.query(models.AiMemoryBrain)
        .filter(models.AiMemoryBrain.status.in_({"approved", "published"}))
        .order_by(models.AiMemoryBrain.updated_at.desc())
        .limit(limit)
        .all()
    )
    for memory in memories:
        total_chunks += ingest_brain_memory(db, memory)
    return {
        "sources": len(sources),
        "indexed_sources": indexed_sources,
        "failed_sources": failed_sources,
        "brain_items": len(memories),
        "chunks": total_chunks,
    }
