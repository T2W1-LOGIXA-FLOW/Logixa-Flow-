from app.routers import rag
from app.schemas import RAGAlertConfig


def test_threshold_crossing_generates_mocked_alert(monkeypatch):
    monkeypatch.setattr(rag, "_error_events", [])
    monkeypatch.setattr(rag, "_alert_history", [])
    monkeypatch.setattr(rag, "_alert_threshold_override", 2)
    monkeypatch.setattr(rag, "_alert_channels", RAGAlertConfig(threshold=2).channels)

    rag._record_error("search", "search")
    assert rag._alert_history == []
    rag._record_error("search", "ranking")

    assert len(rag._alert_history) == 1
    alert = rag._alert_history[0]
    assert alert.threshold == 2
    assert alert.errors == 2
    assert alert.dispatch == "mocked"
    assert alert.channels[0].channel == "in_app"


def test_alert_history_endpoint_is_safe_and_config_is_process_local(monkeypatch):
    monkeypatch.setattr(rag, "_alert_history", [])
    monkeypatch.setattr(rag, "_alert_threshold_override", None)
    result = rag.rag_alerts(_={"role": "admin"})
    assert result["alerts"] == []
    assert "secret" not in str(result).lower()

    configured = rag.rag_alerts_config(
        config=RAGAlertConfig(threshold=9, channels=[{"channel": "log", "enabled": True}]),
        _={"role": "admin"},
    )
    assert configured["threshold"] == 9
    assert configured["persistent"] is False
    assert configured["channels"][0]["channel"] == "log"
