from __future__ import annotations

import logging

import config
import bridge
import publisher
import pytest


AGENT_TOKEN = "test-agent-service-token"


class Response:
    status_code = 201

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict[str, str]:
        return {"slug": "approved-draft"}


def test_agent_config_no_longer_reads_legacy_admin_credentials(monkeypatch):
    monkeypatch.setenv("ADMIN_USERNAME", "legacy-user")
    monkeypatch.setenv("ADMIN_PASSWORD", "legacy-password")

    assert not hasattr(config, "ADMIN_USERNAME")
    assert not hasattr(config, "ADMIN_PASSWORD")


def test_backend_requests_fail_closed_when_agent_token_is_missing(monkeypatch):
    monkeypatch.setattr(config, "AGENT_SERVICE_TOKEN", None)

    with pytest.raises(RuntimeError, match="AGENT_SERVICE_TOKEN is required"):
        bridge.LogixaWebBridge()._headers()
    with pytest.raises(RuntimeError, match="AGENT_SERVICE_TOKEN is required"):
        publisher.publish_post({"slug": "approved-draft"})


def test_bridge_sends_service_token_without_legacy_login(monkeypatch):
    monkeypatch.setattr(config, "AGENT_SERVICE_TOKEN", AGENT_TOKEN)
    calls = []

    def fake_post(url, **kwargs):
        calls.append((url, kwargs))
        return Response()

    monkeypatch.setattr(bridge.requests, "post", fake_post)
    result = bridge.LogixaWebBridge("https://backend.example").sync_feeds()

    assert result == {"slug": "approved-draft"}
    assert calls[0][0] == "https://backend.example/api/admin/integration/sync-feeds"
    assert calls[0][1]["headers"] == {"X-Agent-Service-Token": AGENT_TOKEN}
    assert all("/api/auth/login" not in url for url, _ in calls)


def test_publisher_sends_service_token_and_never_logs_it(monkeypatch, caplog):
    monkeypatch.setattr(config, "AGENT_SERVICE_TOKEN", AGENT_TOKEN)
    monkeypatch.setattr(publisher, "BACKEND_URL", "https://backend.example")
    calls = []

    def fake_post(url, **kwargs):
        calls.append((url, kwargs))
        return Response()

    monkeypatch.setattr(publisher.requests, "post", fake_post)
    with caplog.at_level(logging.DEBUG):
        result = publisher.publish_post({"slug": "approved-draft"})

    assert result == {"slug": "approved-draft"}
    assert calls[0][0] == "https://backend.example/api/posts"
    assert calls[0][1]["headers"] == {"X-Agent-Service-Token": AGENT_TOKEN}
    assert "/api/auth/login" not in calls[0][0]
    assert AGENT_TOKEN not in caplog.text
