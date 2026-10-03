from __future__ import annotations

import logging

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from fastapi.routing import APIRoute

from .. import security
from ..database import get_db
from ..main import app
from ..routers import integration


AGENT_TOKEN = "test-agent-service-token"


def test_agent_service_token_authentication_is_scoped_and_fail_closed(monkeypatch, caplog):
    monkeypatch.setenv("AGENT_SERVICE_TOKEN", AGENT_TOKEN)

    identity = security.require_agent_service_token(AGENT_TOKEN)
    assert identity == {
        "sub": "agent-service",
        "role": "agent_service",
        "scope": "agent:content_pipeline",
    }

    with pytest.raises(HTTPException) as missing:
        security.require_agent_service_token(None)
    assert missing.value.status_code == 401

    with caplog.at_level(logging.WARNING):
        with pytest.raises(HTTPException) as invalid:
            security.require_agent_service_token("wrong-token")
    assert invalid.value.status_code == 401
    assert AGENT_TOKEN not in caplog.text
    assert "wrong-token" not in str(invalid.value.detail)

    monkeypatch.delenv("AGENT_SERVICE_TOKEN")
    with pytest.raises(HTTPException) as unconfigured:
        security.require_agent_service_token(AGENT_TOKEN)
    assert unconfigured.value.status_code == 503


def test_agent_token_does_not_authenticate_as_a_human_admin(monkeypatch):
    monkeypatch.setenv("AGENT_SERVICE_TOKEN", AGENT_TOKEN)

    def reject_non_supabase_token(token: str):
        assert token == AGENT_TOKEN
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    monkeypatch.setattr(security, "_verify_supabase_token", reject_non_supabase_token)
    with pytest.raises(HTTPException) as rejected:
        security.require_admin(f"Bearer {AGENT_TOKEN}")
    assert rejected.value.status_code == 401


def test_supabase_human_admin_authentication_is_preserved(monkeypatch):
    human = {"sub": "admin-user", "email": "admin@example.com", "role": "admin"}
    monkeypatch.setattr(security, "_verify_supabase_token", lambda token: human if token == "supabase-token" else None)

    assert security.require_admin("Bearer supabase-token") == human
    assert security.require_admin_or_agent_service("Bearer supabase-token", None) == human


def test_agent_service_token_is_accepted_only_on_agent_enabled_endpoints(monkeypatch):
    monkeypatch.setenv("AGENT_SERVICE_TOKEN", AGENT_TOKEN)
    monkeypatch.setattr(
        integration,
        "sync_default_feeds",
        lambda db, limit_per_feed: {"synced": limit_per_feed},
    )

    def fake_db():
        yield object()

    app.dependency_overrides[get_db] = fake_db
    client = TestClient(app)
    try:
        allowed = client.post(
            "/api/admin/integration/sync-feeds",
            headers={"X-Agent-Service-Token": AGENT_TOKEN},
        )
        assert allowed.status_code == 200
        assert allowed.json() == {"synced": 5}

        rejected = client.get(
            "/api/admin/integration/feeds",
            headers={"X-Agent-Service-Token": AGENT_TOKEN},
        )
        assert rejected.status_code == 401

        bad_token = client.post(
            "/api/admin/integration/sync-feeds",
            headers={"X-Agent-Service-Token": "wrong-token"},
        )
        assert bad_token.status_code == 401
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_agent_service_auth_is_limited_to_agent_operations():
    agent_paths = {
        route.path
        for route in app.routes
        if isinstance(route, APIRoute)
        and any(
            dependency.call is security.require_admin_or_agent_service
            for dependency in route.dependant.dependencies
        )
    }

    assert agent_paths == {
        "/api/admin/integration/sync-feeds",
        "/api/admin/integration/import-drafts",
        "/api/admin/integration/import-draft",
        "/api/admin/integration/pipeline-preview",
        "/api/admin/rag/ingest/sources",
        "/api/posts",
    }
