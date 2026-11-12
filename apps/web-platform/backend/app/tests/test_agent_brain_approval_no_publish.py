from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from .. import models, security
from ..database import Base, get_db
from ..main import app
from ..routers import agent as agent_router


@pytest.fixture
def isolated_agent_brain_db(monkeypatch: pytest.MonkeyPatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)

    def override_db():
        with session_factory() as session:
            yield session

    monkeypatch.setenv("AGENT_SERVICE_TOKEN", "test-agent-token")
    app.dependency_overrides[get_db] = override_db
    try:
        yield TestClient(app), session_factory
    finally:
        app.dependency_overrides.pop(get_db, None)
        Base.metadata.drop_all(engine)
        engine.dispose()


def test_agent_brain_draft_stays_private_and_unpublished_until_approval(
    isolated_agent_brain_db, monkeypatch: pytest.MonkeyPatch
) -> None:
    client, session_factory = isolated_agent_brain_db

    def fake_content_graph(db, run, message, sources):
        return SimpleNamespace(
            final={
                "title": "P0 private approval smoke",
                "excerpt": "Non-publishing Agent to Brain approval verification.",
                "content_html": "<p>Local-only approval test content.</p>",
                "model": "test-model",
                "fact_check": {"verdict": "pass"},
                "quality_gate": {"verdict": "pass"},
            },
            providers=["test"],
            total_tokens=12,
        )

    monkeypatch.setattr(agent_router, "execute_content_graph", fake_content_graph)
    app.dependency_overrides[security.require_admin] = lambda: {
        "sub": "p0-release-test-admin",
        "role": "admin",
    }
    try:
        response = client.post(
            "/api/agent/run",
            json={"message": "Create a private P0 approval smoke draft", "source_ids": []},
        )
        assert response.status_code == 201, response.text
        payload = response.json()
        assert payload["status"] == "completed"
        assert payload["memory"]["status"] == "pending"
        assert payload["memory"]["is_public"] is False

        memory_id = payload["memory"]["id"]
        publish_response = client.patch(
            f"/api/admin/brain/{memory_id}/publish",
            json={"publish_now": True},
        )
        assert publish_response.status_code == 409
        assert "approval" in publish_response.text.lower()

        with session_factory() as session:
            memory = session.query(models.AiMemoryBrain).filter_by(id=memory_id).one()
            assert memory.status == "pending"
            assert memory.is_public is False
            assert session.query(models.Post).count() == 0
    finally:
        app.dependency_overrides.pop(security.require_admin, None)
