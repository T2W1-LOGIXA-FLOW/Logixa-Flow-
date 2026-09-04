from app.routers import rag
from app.schemas import RAGSearchFilters, RAGSearchPagination, RAGSearchSort, RAGSearchQuery


def test_search_filters_sort_and_paginates(monkeypatch):
    monkeypatch.setattr(rag, "_search_cache", {})
    monkeypatch.setattr(
        rag,
        "similarity_search",
        lambda db, query, top_k: [
            {"source_type": "guide", "source_id": "1", "title": "B", "score": 0.8, "content": "b"},
            {"source_type": "guide", "source_id": "2", "title": "A", "score": 0.9, "content": "a"},
            {"source_type": "article", "source_id": "3", "title": "C", "score": 0.7, "content": "c"},
        ],
    )
    result = rag._search_results(
        object(),
        "ports",
        RAGSearchFilters(source_type="guide", min_score=0.8),
        RAGSearchSort.title,
        RAGSearchPagination(page=1, page_size=1),
    )
    assert result["total"] == 2
    assert result["matches"][0]["title"] == "A"
    assert result["matches"][0]["relevance"]["rank"] == 1
    assert result["has_more"] is True


def test_batch_search_aggregates_duplicate_matches(monkeypatch):
    monkeypatch.setattr(rag, "_search_cache", {})
    class FakeSession:
        def close(self):
            pass

    monkeypatch.setattr(rag, "SessionLocal", FakeSession)
    monkeypatch.setattr(
        rag,
        "similarity_search",
        lambda db, query, top_k: [{"source_type": "guide", "source_id": "1", "title": "A", "score": 0.8, "content": query}],
    )
    payload = [
        RAGSearchQuery(query="one"),
        RAGSearchQuery(query="two"),
    ]
    result = rag.rag_search_batch(payload=payload, db=object(), _={"role": "admin"})
    assert len(result["queries"]) == 2
    assert result["total"] == 1
    assert result["matches"][0]["source_id"] == "1"


def test_newest_sort_falls_back_to_relevance_without_timestamps(monkeypatch):
    monkeypatch.setattr(rag, "_search_cache", {})
    monkeypatch.setattr(
        rag,
        "similarity_search",
        lambda db, query, top_k: [
            {"source_id": "low", "title": "Low", "score": 0.2},
            {"source_id": "high", "title": "High", "score": 0.9},
        ],
    )
    result = rag._search_results(
        object(),
        "ports",
        RAGSearchFilters(),
        RAGSearchSort.newest,
        RAGSearchPagination(),
    )
    assert [match["source_id"] for match in result["matches"]] == ["high", "low"]


def test_batch_search_uses_and_closes_distinct_worker_sessions(monkeypatch):
    monkeypatch.setattr(rag, "_search_cache", {})
    sessions = []

    class FakeSession:
        def __init__(self):
            self.closed = False
            sessions.append(self)

        def close(self):
            self.closed = True

    monkeypatch.setattr(rag, "SessionLocal", FakeSession)
    monkeypatch.setattr(
        rag,
        "similarity_search",
        lambda db, query, top_k: [{"source_id": query, "score": 0.8}],
    )
    rag.rag_search_batch(
        payload=[RAGSearchQuery(query="one"), RAGSearchQuery(query="two")],
        db=object(),
        _={"role": "admin"},
    )
    assert len(sessions) == 2
    assert all(session.closed for session in sessions)
