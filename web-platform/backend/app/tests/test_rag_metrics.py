from datetime import UTC, datetime, timedelta

from app.routers import rag


def test_metrics_aggregates_types_trends_and_alert(monkeypatch):
    now = datetime.now(UTC)
    monkeypatch.setattr(
        rag,
        "_error_events",
        [
            {"operation": "search", "error_type": "search", "timestamp": now.isoformat()},
            {"operation": "search", "error_type": "ranking", "timestamp": now.isoformat()},
            {
                "operation": "ingestion",
                "error_type": "embedding",
                "timestamp": (now - timedelta(hours=30)).isoformat(),
            },
        ],
    )
    monkeypatch.setenv("RAG_ERROR_ALERT_THRESHOLD", "2")

    result = rag.rag_metrics(hours=24, _={"role": "admin"})

    assert result["total_errors"] == 2
    assert result["error_rate"] == 0.0833
    assert {item["error_type"] for item in result["by_type"]} == {"search", "ranking"}
    assert result["alert"] == {"threshold": 2, "errors": 2, "triggered": True}
    assert len(result["time_series"]) == 25


def test_metrics_returns_empty_window_without_secrets(monkeypatch):
    monkeypatch.setattr(rag, "_error_events", [])
    result = rag.rag_metrics(hours=1, _={"role": "admin"})

    assert result["total_errors"] == 0
    assert result["by_type"] == []
    assert result["alert"]["triggered"] is False
