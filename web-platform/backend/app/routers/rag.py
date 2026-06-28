from __future__ import annotations

import os

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..db_bootstrap import database_profile
from ..rag.ingest import ingest_all_sources, ingest_brain_memory, ingest_intelligence_source
from ..rag.pgvector_store import pgvector_enabled
from ..rag.search import build_rag_context, similarity_search
from .. import models
from ..security import require_admin

router = APIRouter()


@router.get("/admin/rag/search")
def rag_search(
    q: str = Query(min_length=3, max_length=2000),
    top_k: int = Query(default=6, ge=1, le=20),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    return {"query": q, "matches": similarity_search(db, q, top_k=top_k)}


@router.get("/admin/rag/context")
def rag_context(
    q: str = Query(min_length=3, max_length=2000),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    return {"query": q, "context": build_rag_context(db, q)}


@router.post("/admin/rag/ingest/sources")
def rag_ingest_sources(
    limit: int = Query(default=200, ge=1, le=500),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    return ingest_all_sources(db, limit=limit)


@router.post("/admin/rag/ingest/source/{source_id}")
def rag_ingest_one_source(
    source_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    source = db.query(models.IntelligenceSource).filter(models.IntelligenceSource.id == source_id).first()
    if not source:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
    chunks = ingest_intelligence_source(db, source)
    return {"source_id": source_id, "chunks": chunks}


@router.post("/admin/rag/ingest/brain/{memory_id}")
def rag_ingest_one_brain(
    memory_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    memory = db.query(models.AiMemoryBrain).filter(models.AiMemoryBrain.id == memory_id).first()
    if not memory:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brain item not found")
    chunks = ingest_brain_memory(db, memory)
    return {"memory_id": memory_id, "chunks": chunks}


@router.get("/admin/rag/status")
def rag_status(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    return {
        "database_profile": database_profile(),
        "embedding_model": os.getenv("EMBEDDING_MODEL", "models/text-embedding-004"),
        "chunk_size": int(os.getenv("RAG_CHUNK_SIZE", "800")),
        "chunk_overlap": int(os.getenv("RAG_CHUNK_OVERLAP", "150")),
        "chunks_total": db.query(models.DocumentEmbedding).count(),
        "pgvector_enabled": pgvector_enabled(db),
        "search_backend": "pgvector" if pgvector_enabled(db) else "json_cosine",
    }
