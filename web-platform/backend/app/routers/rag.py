from __future__ import annotations

import logging
import os
import time
from collections.abc import Callable
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session

from ..database import get_db
from ..db_bootstrap import database_profile
from ..rag.ingest import ingest_all_sources, ingest_brain_memory, ingest_intelligence_source
from ..rag.pgvector_store import pgvector_enabled
from ..rag.search import build_rag_context, similarity_search
from .. import models
from ..schemas import (
    RAGCorrelationId,
    RAGErrorRateMetrics,
    RAGIngestionError,
    RAGIngestionErrorType,
    RAGRetryInfo,
    RAGSearchError,
    RAGSearchErrorType,
)
from ..security import require_admin

router = APIRouter()
logger = logging.getLogger(__name__)
MAX_INGEST_ATTEMPTS = 3
MAX_SEARCH_ATTEMPTS = 2
_error_counts: dict[str, int] = {"ingestion": 0, "search": 0}


def _classify_ingestion_error(error: Exception) -> RAGIngestionErrorType:
    if isinstance(error, (ValueError, TypeError)):
        return RAGIngestionErrorType.validation
    if isinstance(error, OperationalError):
        return RAGIngestionErrorType.transient
    if isinstance(error, SQLAlchemyError):
        return RAGIngestionErrorType.database
    if "embed" in error.__class__.__name__.lower() or "embedding" in str(error).lower():
        return RAGIngestionErrorType.embedding
    return RAGIngestionErrorType.unknown


def _run_ingestion(
    operation: Callable[[], dict],
    *,
    operation_name: str,
) -> dict:
    correlation_id = uuid4()
    last_error: Exception | None = None
    final_attempt = 0
    for attempt in range(1, MAX_INGEST_ATTEMPTS + 1):
        final_attempt = attempt
        try:
            result = operation()
            result["correlation_id"] = str(correlation_id)
            result["attempts"] = attempt
            result["errors"] = 0
            return result
        except Exception as error:
            last_error = error
            _error_counts["ingestion"] += 1
            error_type = _classify_ingestion_error(error)
            retryable = error_type == RAGIngestionErrorType.transient and attempt < MAX_INGEST_ATTEMPTS
            logger.warning(
                "RAG ingestion failed",
                extra={
                    "correlation_id": str(correlation_id),
                    "operation": operation_name,
                    "error_type": error_type.value,
                    "attempt": attempt,
                    "retryable": retryable,
                },
                exc_info=False,
            )
            if not retryable:
                break
            time.sleep(0.05 * attempt)

    assert last_error is not None
    error_type = _classify_ingestion_error(last_error)
    retryable = error_type == RAGIngestionErrorType.transient
    payload = RAGIngestionError(
        error_type=error_type,
        message="RAG ingestion failed. Review the correlation ID and retry if permitted.",
        retry=RAGRetryInfo(
            retryable=retryable,
            attempt=final_attempt,
            max_attempts=MAX_INGEST_ATTEMPTS,
        ),
        correlation=RAGCorrelationId(correlation_id=correlation_id),
    )
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE if retryable else 422,
        detail=payload.model_dump(mode="json"),
    ) from last_error


def _run_search(operation: Callable[[], dict], *, operation_name: str) -> dict:
    correlation_id = uuid4()
    last_error: Exception | None = None
    for attempt in range(1, MAX_SEARCH_ATTEMPTS + 1):
        try:
            result = operation()
            result["correlation_id"] = str(correlation_id)
            result["attempts"] = attempt
            return result
        except Exception as error:
            last_error = error
            error_type = (
                RAGSearchErrorType.validation
                if isinstance(error, (ValueError, TypeError))
                else RAGSearchErrorType.transient
                if isinstance(error, OperationalError)
                else RAGSearchErrorType.backend
                if isinstance(error, SQLAlchemyError)
                else RAGSearchErrorType.unknown
            )
            _error_counts["search"] += 1
            threshold = max(1, int(os.getenv("RAG_ERROR_ALERT_THRESHOLD", "5")))
            logger.warning(
                "RAG search failed",
                extra={
                    "correlation_id": str(correlation_id),
                    "operation": operation_name,
                    "error_type": error_type.value,
                    "attempt": attempt,
                    "retryable": error_type == RAGSearchErrorType.transient and attempt < MAX_SEARCH_ATTEMPTS,
                    "error_count": _error_counts["search"],
                },
                exc_info=False,
            )
            if error_type != RAGSearchErrorType.transient or attempt == MAX_SEARCH_ATTEMPTS:
                break
            time.sleep(0.05 * attempt)

    assert last_error is not None
    error_type = (
        RAGSearchErrorType.validation
        if isinstance(last_error, (ValueError, TypeError))
        else RAGSearchErrorType.transient
        if isinstance(last_error, OperationalError)
        else RAGSearchErrorType.backend
        if isinstance(last_error, SQLAlchemyError)
        else RAGSearchErrorType.unknown
    )
    threshold = max(1, int(os.getenv("RAG_ERROR_ALERT_THRESHOLD", "5")))
    if _error_counts["search"] >= threshold:
        logger.error(
            "RAG search error threshold reached",
            extra={
                "operation": operation_name,
                "error_count": _error_counts["search"],
                "alert_threshold": threshold,
                "alert_triggered": True,
            },
        )
    payload = RAGSearchError(
        error_type=error_type,
        message="RAG search failed. Review the correlation ID and retry if permitted.",
        retry=RAGRetryInfo(
            retryable=error_type == RAGSearchErrorType.transient,
            attempt=attempt,
            max_attempts=MAX_SEARCH_ATTEMPTS,
        ),
        correlation=RAGCorrelationId(correlation_id=correlation_id),
    )
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE
        if error_type == RAGSearchErrorType.transient
        else 422,
        detail={
            **payload.model_dump(mode="json"),
            "metrics": RAGErrorRateMetrics(
                operation="search",
                errors=_error_counts["search"],
                alert_threshold=threshold,
                alert_triggered=_error_counts["search"] >= threshold,
            ).model_dump(mode="json"),
        },
    ) from last_error


@router.get("/admin/rag/search")
def rag_search(
    q: str = Query(min_length=3, max_length=2000),
    top_k: int = Query(default=6, ge=1, le=20),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    return _run_search(
        lambda: {"query": q, "matches": similarity_search(db, q, top_k=top_k)},
        operation_name="search",
    )


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
    return _run_ingestion(
        lambda: ingest_all_sources(db, limit=limit),
        operation_name="all_sources",
    )


@router.post("/admin/rag/ingest/source/{source_id}")
def rag_ingest_one_source(
    source_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    source = db.query(models.IntelligenceSource).filter(models.IntelligenceSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
    return _run_ingestion(
        lambda: {"source_id": source_id, "chunks": ingest_intelligence_source(db, source)},
        operation_name=f"source:{source_id}",
    )


@router.post("/admin/rag/ingest/brain/{memory_id}")
def rag_ingest_one_brain(
    memory_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    memory = db.query(models.AiMemoryBrain).filter(models.AiMemoryBrain.id == memory_id).first()
    if not memory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brain item not found")
    return _run_ingestion(
        lambda: {"memory_id": memory_id, "chunks": ingest_brain_memory(db, memory)},
        operation_name=f"brain:{memory_id}",
    )


@router.get("/admin/rag/status")
def rag_status(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    alert_threshold = max(1, int(os.getenv("RAG_ERROR_ALERT_THRESHOLD", "5")))
    return {
        "database_profile": database_profile(),
        "embedding_model": os.getenv("EMBEDDING_MODEL", "models/text-embedding-004"),
        "chunk_size": int(os.getenv("RAG_CHUNK_SIZE", "800")),
        "chunk_overlap": int(os.getenv("RAG_CHUNK_OVERLAP", "150")),
        "chunks_total": db.query(models.DocumentEmbedding).count(),
        "pgvector_enabled": pgvector_enabled(db),
        "search_backend": "pgvector" if pgvector_enabled(db) else "json_cosine",
        "error_metrics": {
            operation: RAGErrorRateMetrics(
                operation=operation,
                errors=count,
                alert_threshold=alert_threshold,
                alert_triggered=count >= alert_threshold,
            ).model_dump(mode="json")
            for operation, count in _error_counts.items()
        },
    }
