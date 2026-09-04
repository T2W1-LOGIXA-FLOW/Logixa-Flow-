import pytest
from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

from app.routers import rag
from app.schemas import RAGSearchErrorType


def test_search_classifies_embedding_error_without_exposing_details(monkeypatch):
    monkeypatch.setattr(
        rag,
        "similarity_search",
        lambda db, q, top_k: (_ for _ in ()).throw(RuntimeError("provider key leaked")),
    )

    with pytest.raises(HTTPException) as exc_info:
        rag.rag_search(q="supply chain", top_k=3, db=object(), _={"role": "admin"})

    detail = exc_info.value.detail
    assert detail["error_type"] == RAGSearchErrorType.unknown.value
    assert "provider key leaked" not in str(detail)
    assert detail["fallback"]["used"] is False
    assert detail["correlation"]["correlation_id"]


def test_search_retries_search_errors_and_returns_matches(monkeypatch):
    attempts = 0

    def flaky(db, q, top_k):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise OperationalError("temporary", {}, RuntimeError("temporary"))
        return [{"source_id": "1", "score": 0.9}]

    monkeypatch.setattr(rag, "similarity_search", flaky)
    result = rag.rag_search(q="supply chain", top_k=3, db=object(), _={"role": "admin"})

    assert attempts == 2
    assert result["matches"][0]["source_id"] == "1"
    assert result["attempts"] == 2


def test_search_classifies_ranking_failures(monkeypatch):
    class RankingError(RuntimeError):
        pass

    monkeypatch.setattr(
        rag,
        "similarity_search",
        lambda db, q, top_k: (_ for _ in ()).throw(RankingError("ranking failed")),
    )

    with pytest.raises(HTTPException) as exc_info:
        rag.rag_search(q="supply chain", top_k=3, db=object(), _={"role": "admin"})

    assert exc_info.value.detail["error_type"] == RAGSearchErrorType.ranking.value
    assert exc_info.value.detail["retry"]["retryable"] is False
