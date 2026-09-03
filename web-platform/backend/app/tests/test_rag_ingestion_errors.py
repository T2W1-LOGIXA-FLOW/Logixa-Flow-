from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.routers import rag
from app.schemas import RAGIngestionErrorType, RAGSearchErrorType


def test_ingestion_error_is_structured_and_redacted(monkeypatch):
    monkeypatch.setattr(rag, "ingest_all_sources", lambda db, limit: (_ for _ in ()).throw(ValueError("secret provider key")))

    with pytest.raises(HTTPException) as exc_info:
        rag.rag_ingest_sources(limit=1, db=object(), _={"role": "admin"})

    assert exc_info.value.status_code == 422
    detail = exc_info.value.detail
    assert detail["error_type"] == RAGSearchErrorType.validation.value
    assert "secret provider key" not in str(detail)
    assert detail["retry"]["retryable"] is False
    assert detail["correlation"]["correlation_id"]


def test_transient_ingestion_retries_then_succeeds(monkeypatch):
    attempts = 0

    def flaky(db, limit):
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            from sqlalchemy.exc import OperationalError

            raise OperationalError("temporary", {}, RuntimeError("temporary"))
        return {"sources": 1, "brain_items": 0, "chunks": 2}

    monkeypatch.setattr(rag, "ingest_all_sources", flaky)
    result = rag.rag_ingest_sources(limit=1, db=object(), _={"role": "admin"})
    assert attempts == 3
    assert result["chunks"] == 2
    assert result["attempts"] == 3
    assert result["errors"] == 0


def test_search_returns_structured_error_and_metrics(monkeypatch):
    monkeypatch.setattr(rag, "similarity_search", lambda db, q, top_k: (_ for _ in ()).throw(ValueError("provider secret")))

    with pytest.raises(HTTPException) as exc_info:
        rag.rag_search(q="supply chain", top_k=3, db=object(), _={"role": "admin"})

    assert exc_info.value.status_code == 422
    detail = exc_info.value.detail
    assert detail["error_type"] == RAGIngestionErrorType.validation.value
    assert "provider secret" not in str(detail)
    assert detail["metrics"]["operation"] == "search"
    assert detail["metrics"]["errors"] >= 1


def test_search_retries_transient_failures(monkeypatch):
    attempts = 0

    def flaky(db, q, top_k):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            from sqlalchemy.exc import OperationalError

            raise OperationalError("temporary", {}, RuntimeError("temporary"))
        return [{"source_id": "1", "score": 0.9}]

    monkeypatch.setattr(rag, "similarity_search", flaky)
    result = rag.rag_search(q="supply chain", top_k=3, db=object(), _={"role": "admin"})
    assert attempts == 2
    assert result["matches"][0]["source_id"] == "1"
