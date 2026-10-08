from __future__ import annotations

import logging
import os
import threading
import time
import json
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query, status
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session

from ..database import SessionLocal, get_db
from ..db_bootstrap import database_profile
from ..rag.ingest import _replace_chunks, ingest_all_sources, ingest_brain_memory, ingest_intelligence_source
from ..rag.pgvector_store import pgvector_enabled
from ..rag.search import build_rag_context, similarity_search
from .. import models
from ..schemas import (
    RAGCorrelationId,
    RAGErrorRateMetrics,
    RAGIngestionError,
    RAGIngestionErrorType,
    RAGRetryInfo,
    RAGSearchFallbackInfo,
    RAGSearchError,
    RAGSearchErrorType,
    RAGMetrics,
    RAGMetricByType,
    RAGTimeSeriesPoint,
    RAGAlertThresholdStatus,
    RAGAlert,
    RAGAlertConfig,
    RAGAlertSeverity,
    RAGAlertType,
    RAGNotificationChannelConfig,
    RAGBatchFileProgress,
    RAGBatchIngestionProgress,
    RAGChunkStatus,
    RAGRecoveryMetadata,
    RAGSearchFilters,
    RAGSearchPagination,
    RAGSearchSort,
    RAGRelevanceScore,
    RAGSearchQuery,
    RAGFeedback,
    RAGQualityMetrics,
    RAGABTestConfig,
)
from ..security import require_admin, require_admin_or_agent_service
from ..rag.observability import record_event

router = APIRouter()
logger = logging.getLogger(__name__)
MAX_INGEST_ATTEMPTS = 3
MAX_SEARCH_ATTEMPTS = 2
_error_counts: dict[str, int] = {"ingestion": 0, "search": 0}
_error_events: list[dict[str, str]] = []
_alert_history: list[RAGAlert] = []
_alert_threshold_override: int | None = None
_alert_channels: list[RAGNotificationChannelConfig] = [
    RAGNotificationChannelConfig(channel="in_app")
]
_search_cache: dict[tuple[int, str, str, float, str, int, int, int], tuple[float, dict]] = {}
_search_cache_lock = threading.RLock()
_search_slots = threading.BoundedSemaphore(value=4)
_search_performance = {
    "requests": 0,
    "cache_hits": 0,
    "timeouts": 0,
    "total_duration_ms": 0.0,
}
_quality_feedback: list[RAGFeedback] = []
_quality_lock = threading.RLock()
_ab_test = RAGABTestConfig(name="rag-search-quality", control="control", treatment="treatment")
SEARCH_TIMEOUT_SECONDS = 5.0
MAX_CACHE_ENTRIES = 512


def _current_alert_threshold() -> int:
    return _alert_threshold_override or max(1, int(os.getenv("RAG_ERROR_ALERT_THRESHOLD", "5")))


def _dispatch_alert(alert: RAGAlert) -> None:
    logger.warning(
        "RAG alert dispatched",
        extra={
            "operation": "alerting",
            "error_count": alert.errors,
            "alert_threshold": alert.threshold,
            "alert_triggered": True,
        },
    )


def _generate_alert_if_needed() -> None:
    threshold = _current_alert_threshold()
    total_errors = len(_error_events)
    if total_errors < threshold:
        return
    if _alert_history and _alert_history[-1].threshold == threshold:
        return
    alert = RAGAlert(
        alert_id=uuid4(),
        alert_type=RAGAlertType.error_threshold,
        severity=RAGAlertSeverity.critical if total_errors >= threshold * 2 else RAGAlertSeverity.warning,
        message="RAG error threshold reached. Review the monitoring dashboard.",
        created_at=datetime.now(UTC),
        errors=total_errors,
        threshold=threshold,
        channels=list(_alert_channels),
        dispatch="mocked",
    )
    _alert_history.append(alert)
    del _alert_history[:-100]
    _dispatch_alert(alert)


def _record_error(operation: str, error_type: str, db: Session | None = None) -> None:
    _error_events.append(
        {
            "operation": operation,
            "error_type": error_type,
            "timestamp": datetime.now(UTC).isoformat(),
        }
    )
    del _error_events[:-5000]
    if db is not None:
        try:
            record_event(db, "error", operation, {"error_type": error_type})
            db.commit()
        except Exception:
            db.rollback()
    _generate_alert_if_needed()


def _prepare_batch_file(file_name: str, content: bytes) -> tuple[str, list[str]]:
    text = content.decode("utf-8")
    from ..rag.chunking import chunk_text

    return file_name, chunk_text(text)


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
    db: Session | None = None,
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
            _record_error("ingestion", error_type.value, db)
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


def _classify_search_error(error: Exception) -> RAGSearchErrorType:
    name = error.__class__.__name__.lower()
    message = str(error).lower()
    if isinstance(error, (ValueError, TypeError)) or "query" in name or "query" in message:
        return RAGSearchErrorType.query
    if "embed" in name or "embedding" in message:
        return RAGSearchErrorType.embedding
    if "rank" in name or "rank" in message:
        return RAGSearchErrorType.ranking
    if isinstance(error, (OperationalError, SQLAlchemyError)):
        return RAGSearchErrorType.search
    return RAGSearchErrorType.unknown


def _query_default(value):
    return getattr(value, "default", value)


def _search_results(
    db: Session,
    query: str,
    filters: RAGSearchFilters,
    sort: RAGSearchSort,
    pagination: RAGSearchPagination,
) -> dict:
    started = time.monotonic()
    with _search_cache_lock:
        _search_performance["requests"] += 1
    cache_key = (
        threading.get_ident(),
        query,
        filters.source_type or "",
        filters.min_score,
        sort.value,
        pagination.page,
        pagination.page_size,
        id(similarity_search),
    )
    with _search_cache_lock:
        cached = _search_cache.get(cache_key)
    if cached and time.time() - cached[0] < 30:
        with _search_cache_lock:
            _search_performance["cache_hits"] += 1
        return {**cached[1], "matches": [dict(match) for match in cached[1]["matches"]]}
    if not _search_slots.acquire(timeout=0.25):
        with _search_cache_lock:
            _search_performance["timeouts"] += 1
        raise TimeoutError("RAG search capacity limit reached")
    try:
        matches = similarity_search(
            db,
            query,
            top_k=min(50, pagination.page * pagination.page_size),
        )
    finally:
        _search_slots.release()
    duration = time.monotonic() - started
    if duration > SEARCH_TIMEOUT_SECONDS:
        with _search_cache_lock:
            _search_performance["timeouts"] += 1
        raise TimeoutError("RAG search exceeded the configured time limit")
    filtered = [
        match for match in matches
        if (not filters.source_type or match.get("source_type") == filters.source_type)
        and float(match.get("score", 0)) >= filters.min_score
    ]
    if sort == RAGSearchSort.title:
        filtered.sort(key=lambda match: str(match.get("title", "")).lower())
    elif sort == RAGSearchSort.newest:
        timestamps = [match.get("created_at") for match in filtered if match.get("created_at") is not None]
        if timestamps:
            filtered.sort(
                key=lambda match: (
                    match.get("created_at") is not None,
                    str(match.get("created_at", "")),
                ),
                reverse=True,
            )
        else:
            filtered.sort(key=lambda match: float(match.get("score", 0)), reverse=True)
    else:
        filtered.sort(key=lambda match: float(match.get("score", 0)), reverse=True)
    total = len(filtered)
    start = (pagination.page - 1) * pagination.page_size
    page_matches = filtered[start : start + pagination.page_size]
    for index, match in enumerate(page_matches, start=start + 1):
        match["relevance"] = RAGRelevanceScore(score=float(match.get("score", 0)), rank=index).model_dump(mode="json")
    result = {
        "query": query,
        "matches": page_matches,
        "total": total,
        "page": pagination.page,
        "page_size": pagination.page_size,
        "has_more": start + pagination.page_size < total,
    }
    with _search_cache_lock:
        _search_cache[cache_key] = (
            time.time(),
            {**result, "matches": [dict(match) for match in page_matches]},
        )
        if len(_search_cache) > MAX_CACHE_ENTRIES:
            oldest_key = min(_search_cache, key=lambda key: _search_cache[key][0])
            del _search_cache[oldest_key]
        _search_performance["total_duration_ms"] += duration * 1000
    return result


def _run_search(operation: Callable[[], dict], *, operation_name: str, db: Session | None = None) -> dict:
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
            error_type = _classify_search_error(error)
            _error_counts["search"] += 1
            _record_error("search", error_type.value, db)
            threshold = _current_alert_threshold()
            logger.warning(
                "RAG search failed",
                extra={
                    "correlation_id": str(correlation_id),
                    "operation": operation_name,
                    "error_type": error_type.value,
                    "attempt": attempt,
                    "retryable": error_type == RAGSearchErrorType.search and attempt < MAX_SEARCH_ATTEMPTS,
                    "error_count": _error_counts["search"],
                    "fallback_used": False,
                    "fallback_strategy": "json_cosine",
                },
                exc_info=False,
            )
            if error_type != RAGSearchErrorType.search or attempt == MAX_SEARCH_ATTEMPTS:
                break
            time.sleep(0.05 * attempt)

    assert last_error is not None
    error_type = _classify_search_error(last_error)
    threshold = max(1, int(os.getenv("RAG_ERROR_ALERT_THRESHOLD", "5")))
    if _error_counts["search"] >= threshold:
        logger.error(
            "RAG search error threshold reached",
            extra={
                "operation": operation_name,
                "error_count": _error_counts["search"],
                "alert_threshold": threshold,
                "alert_triggered": True,
                "fallback_used": False,
                "fallback_strategy": "json_cosine",
            },
        )
    payload = RAGSearchError(
        error_type=error_type,
        message="RAG search failed. Review the correlation ID and retry if permitted.",
        retry=RAGRetryInfo(
            retryable=error_type == RAGSearchErrorType.search,
            attempt=attempt,
            max_attempts=MAX_SEARCH_ATTEMPTS,
        ),
        correlation=RAGCorrelationId(correlation_id=correlation_id),
        fallback=RAGSearchFallbackInfo(used=False, strategy="json_cosine"),
    )
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE
        if error_type == RAGSearchErrorType.search
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
    source_type: str | None = Query(default=None, max_length=50),
    min_score: float = Query(default=0, ge=0, le=1),
    sort: RAGSearchSort = Query(default=RAGSearchSort.relevance),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=6, ge=1, le=50),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    q = _query_default(q)
    top_k = _query_default(top_k)
    source_type = _query_default(source_type)
    min_score = _query_default(min_score)
    sort = _query_default(sort)
    page = _query_default(page)
    page_size = _query_default(page_size)
    return _run_search(
        lambda: _search_results(
            db,
            q,
            RAGSearchFilters(source_type=source_type, min_score=min_score),
            sort,
            RAGSearchPagination(page=page, page_size=min(page_size, top_k)),
        ),
        operation_name="search",
        db=db,
    )


@router.post("/admin/rag/search/batch")
def rag_search_batch(
    payload: list[RAGSearchQuery],
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    if not payload or len(payload) > 10:
        raise HTTPException(status_code=422, detail="Batch search must contain between 1 and 10 queries")
    from concurrent.futures import ThreadPoolExecutor

    def run(item: RAGSearchQuery) -> dict:
        worker_db = SessionLocal()
        try:
            return _search_results(worker_db, item.query, item.filters, item.sort, item.pagination)
        finally:
            worker_db.close()

    with ThreadPoolExecutor(max_workers=min(4, len(payload))) as executor:
        results = list(executor.map(run, payload))
    aggregated: dict[str, dict] = {}
    for result in results:
        for match in result["matches"]:
            key = f'{match.get("source_type")}:{match.get("source_id")}:{match.get("title")}'
            aggregated.setdefault(key, match)
    matches = sorted(aggregated.values(), key=lambda match: float(match.get("score", 0)), reverse=True)
    return {"queries": results, "matches": matches, "total": len(matches)}


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
    _: dict = Depends(require_admin_or_agent_service),
) -> dict:
    return _run_ingestion(
        lambda: ingest_all_sources(db, limit=limit),
        operation_name="all_sources",
        db=db,
    )


@router.post("/admin/rag/ingest/batch")
def rag_ingest_batch(
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    if not files or len(files) > 20:
        raise HTTPException(status_code=422, detail="Batch must contain between 1 and 20 files")
    batch_id = uuid4()
    prepared: list[tuple[str, list[str]]] = []
    progress: list[RAGBatchFileProgress] = []
    with ThreadPoolExecutor(max_workers=min(4, len(files))) as executor:
        futures = [
            executor.submit(_prepare_batch_file, file.filename or "unnamed", file.file.read())
            for file in files
        ]
        for future, file in zip(futures, files):
            file_name = file.filename or "unnamed"
            try:
                prepared.append(future.result())
            except (UnicodeDecodeError, ValueError) as error:
                progress.append(
                    RAGBatchFileProgress(
                        file_name=file_name,
                        status=RAGChunkStatus.failed,
                        chunks=0,
                        error="File could not be prepared for ingestion.",
                        recovery=RAGRecoveryMetadata(
                            retryable=False,
                            attempts=1,
                            max_attempts=1,
                            message=error.__class__.__name__,
                        ),
                    )
                )
    for file_name, chunks in prepared:
        try:
            count = _replace_chunks(
                db,
                source_type="batch_upload",
                source_id=f"{batch_id}:{file_name}",
                title=file_name,
                chunks=chunks,
            )
            progress.append(
                RAGBatchFileProgress(
                    file_name=file_name,
                    status=RAGChunkStatus.completed,
                    chunks=count,
                    recovery=RAGRecoveryMetadata(retryable=False, attempts=1, max_attempts=1),
                )
            )
        except Exception:
            progress.append(
                RAGBatchFileProgress(
                    file_name=file_name,
                    status=RAGChunkStatus.failed,
                    chunks=0,
                    error="File ingestion failed. Retry this file or review server logs.",
                    recovery=RAGRecoveryMetadata(
                        retryable=True,
                        attempts=1,
                        max_attempts=3,
                        message="safe retry available",
                    ),
                )
            )
    payload = RAGBatchIngestionProgress(
        batch_id=batch_id,
        total_files=len(files),
        completed_files=sum(item.status == RAGChunkStatus.completed for item in progress),
        failed_files=sum(item.status == RAGChunkStatus.failed for item in progress),
        total_chunks=sum(item.chunks for item in progress),
        files=progress,
    )
    return payload.model_dump(mode="json")


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
        db=db,
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
        db=db,
    )


@router.get("/admin/rag/status")
def rag_status(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    alert_threshold = _current_alert_threshold()
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


@router.get("/admin/rag/metrics")
def rag_metrics(
    hours: int = Query(default=24, ge=1, le=168),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    now = datetime.now(UTC)
    cutoff = now - timedelta(hours=hours)
    events = [event for event in _error_events if datetime.fromisoformat(event["timestamp"]) >= cutoff]
    try:
        rows = db.execute(__import__("sqlalchemy").text("SELECT operation, payload, created_at FROM rag_observability_events WHERE event_type = 'error' AND created_at >= :cutoff ORDER BY created_at ASC"), {"cutoff": cutoff}).mappings().all()
        for row in rows:
            payload = json.loads(row["payload"] or "{}")
            events.append({"operation": row["operation"], "error_type": payload.get("error_type", "unknown"), "timestamp": row["created_at"].isoformat()})
    except Exception:
        db.rollback()
    total_errors = len(events)
    by_type_counts: dict[str, int] = {}
    for event in events:
        by_type_counts[event["error_type"]] = by_type_counts.get(event["error_type"], 0) + 1
    by_type = [
        RAGMetricByType(
            error_type=error_type,
            errors=count,
            rate=round(count / hours, 4),
        )
        for error_type, count in sorted(by_type_counts.items())
    ]
    bucket_start = cutoff.replace(minute=0, second=0, microsecond=0)
    buckets = {bucket_start + timedelta(hours=index): 0 for index in range(hours + 1)}
    for event in events:
        timestamp = datetime.fromisoformat(event["timestamp"])
        bucket = timestamp.replace(minute=0, second=0, microsecond=0)
        if bucket in buckets:
            buckets[bucket] += 1
    threshold = _current_alert_threshold()
    payload = RAGMetrics(
        hours=hours,
        total_errors=total_errors,
        error_rate=round(total_errors / hours, 4),
        by_type=by_type,
        time_series=[
            RAGTimeSeriesPoint(timestamp=timestamp, errors=errors)
            for timestamp, errors in buckets.items()
        ],
        alert=RAGAlertThresholdStatus(
            threshold=threshold,
            errors=total_errors,
            triggered=total_errors >= threshold,
        ),
    )
    return payload.model_dump(mode="json")


@router.get("/admin/rag/performance")
def rag_performance(_: dict = Depends(require_admin)) -> dict:
    with _search_cache_lock:
        requests = int(_search_performance["requests"])
        cache_hits = int(_search_performance["cache_hits"])
        average_duration_ms = (
            _search_performance["total_duration_ms"] / max(1, requests - cache_hits)
        )
        return {
            "cache": {
                "entries": len(_search_cache),
                "max_entries": MAX_CACHE_ENTRIES,
                "ttl_seconds": 30,
                "hit_rate": round(cache_hits / max(1, requests), 4),
            },
            "search": {
                "requests": requests,
                "cache_hits": cache_hits,
                "timeouts": _search_performance["timeouts"],
                "average_duration_ms": round(average_duration_ms, 2),
                "concurrency_limit": 4,
                "timeout_seconds": SEARCH_TIMEOUT_SECONDS,
            },
            "query_plan": {
                "index_strategy": "vector_similarity_backend",
                "lazy_loading": True,
                "max_candidates": 50,
                "ordering_fallback": "relevance_when_created_at_unavailable",
            },
            "recommendations": [
                "Keep vector index statistics current before production scale-up.",
                "Review timeout counts if search latency increases.",
            ],
        }


@router.post("/admin/rag/quality/feedback")
def rag_quality_feedback(
    feedback: RAGFeedback,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    with _quality_lock:
        _quality_feedback.append(feedback)
        del _quality_feedback[:-5000]
        count = len(_quality_feedback)
    try:
        record_event(db, "quality_feedback", "rag_search", feedback.model_dump(mode="json"))
        db.commit()
    except Exception:
        db.rollback()
    logger.info("RAG quality feedback recorded", extra={"operation": "quality_feedback", "feedback_count": count})
    return {"accepted": True, "feedback_count": count}


@router.get("/admin/rag/quality")
def rag_quality(db: Session = Depends(get_db), _: dict = Depends(require_admin)) -> dict:
    with _quality_lock:
        feedback = list(_quality_feedback)
        ab_test = _ab_test
    try:
        rows = db.execute(__import__("sqlalchemy").text("SELECT payload FROM rag_observability_events WHERE event_type = 'quality_feedback' ORDER BY created_at ASC")).mappings().all()
        feedback.extend(RAGFeedback.model_validate(json.loads(row["payload"])) for row in rows)
    except Exception:
        db.rollback()
    count = len(feedback)
    average_rating = sum(item.rating for item in feedback) / count if count else 0.0
    helpful_rate = sum(item.helpful for item in feedback) / count if count else 0.0
    by_variant: dict[str, dict[str, float | int]] = {}
    for item in feedback:
        bucket = by_variant.setdefault(item.variant, {"feedback_count": 0, "average_rating": 0.0, "helpful_rate": 0.0})
        bucket["feedback_count"] = int(bucket["feedback_count"]) + 1
        bucket["average_rating"] = float(bucket["average_rating"]) + item.rating
        bucket["helpful_rate"] = float(bucket["helpful_rate"]) + int(item.helpful)
    for bucket in by_variant.values():
        bucket["average_rating"] = round(float(bucket["average_rating"]) / int(bucket["feedback_count"]), 2)
        bucket["helpful_rate"] = round(float(bucket["helpful_rate"]) / int(bucket["feedback_count"]), 4)
    payload = RAGQualityMetrics(
        feedback_count=count,
        average_rating=round(average_rating, 2),
        helpful_rate=round(helpful_rate, 4),
        by_variant=by_variant,
        ab_test=ab_test,
        report="Quality metrics are based on bounded in-memory admin feedback.",
    )
    return payload.model_dump(mode="json")


@router.get("/admin/rag/quality/ab-test")
def rag_quality_ab_test(_: dict = Depends(require_admin)) -> dict:
    with _quality_lock:
        return {"config": _ab_test.model_dump(mode="json"), "persistent": False}


@router.post("/admin/rag/quality/ab-test")
def rag_quality_ab_test_config(
    config: RAGABTestConfig,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    global _ab_test
    with _quality_lock:
        _ab_test = config
    try:
        record_event(db, "ab_test_config", "rag_quality", config.model_dump(mode="json"))
        db.commit()
    except Exception:
        db.rollback()
    return {"config": config.model_dump(mode="json"), "persistent": True}


@router.get("/admin/rag/alerts")
def rag_alerts(_: dict = Depends(require_admin)) -> dict:
    return {
        "threshold": _current_alert_threshold(),
        "channels": [channel.model_dump(mode="json") for channel in _alert_channels],
        "alerts": [alert.model_dump(mode="json") for alert in reversed(_alert_history)],
    }


@router.post("/admin/rag/alerts/config")
def rag_alerts_config(
    config: RAGAlertConfig,
    _: dict = Depends(require_admin),
) -> dict:
    global _alert_threshold_override, _alert_channels
    _alert_threshold_override = config.threshold
    _alert_channels = list(config.channels)
    return {
        "threshold": _current_alert_threshold(),
        "channels": [channel.model_dump(mode="json") for channel in _alert_channels],
        "persistent": False,
    }
