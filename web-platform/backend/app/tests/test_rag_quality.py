from app.routers import rag
from app.schemas import RAGABTestConfig, RAGFeedback


def test_quality_feedback_and_metrics_are_aggregated(monkeypatch):
    monkeypatch.setattr(rag, "_quality_feedback", [])
    rag.rag_quality_feedback(RAGFeedback(query_id="q1", rating=5, helpful=True), _={"role": "admin"})
    rag.rag_quality_feedback(RAGFeedback(query_id="q2", rating=3, helpful=False, variant="treatment"), _={"role": "admin"})
    result = rag.rag_quality(_={"role": "admin"})
    assert result["feedback_count"] == 2
    assert result["average_rating"] == 4.0
    assert result["helpful_rate"] == 0.5
    assert result["by_variant"]["treatment"]["helpful_rate"] == 0.0


def test_ab_test_configuration_is_persistent():
    result = rag.rag_quality_ab_test_config(
        RAGABTestConfig(name="test", control="a", treatment="b", enabled=True),
        _={"role": "admin"},
    )
    assert result["persistent"] is True
    assert result["config"]["enabled"] is True
