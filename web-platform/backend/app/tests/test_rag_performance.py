from app.routers import rag
from app.schemas import RAGSearchFilters, RAGSearchPagination, RAGSearchSort


def test_search_performance_tracks_cache_and_bounds_candidates(monkeypatch):
    monkeypatch.setattr(rag, "_search_cache", {})
    monkeypatch.setattr(rag, "_search_performance", {"requests": 0, "cache_hits": 0, "timeouts": 0, "total_duration_ms": 0.0})
    calls = []
    monkeypatch.setattr(
        rag,
        "similarity_search",
        lambda db, query, top_k: calls.append(top_k) or [{"source_id": "1", "score": 0.8}],
    )
    args = (object(), "ports", RAGSearchFilters(), RAGSearchSort.relevance, RAGSearchPagination(page=1, page_size=2))
    rag._search_results(*args)
    rag._search_results(*args)
    assert calls == [2]
    assert rag._search_performance["cache_hits"] == 1


def test_performance_endpoint_returns_safe_optimization_signals():
    result = rag.rag_performance(_={"role": "admin"})
    assert result["query_plan"]["lazy_loading"] is True
    assert "password" not in str(result).lower()
