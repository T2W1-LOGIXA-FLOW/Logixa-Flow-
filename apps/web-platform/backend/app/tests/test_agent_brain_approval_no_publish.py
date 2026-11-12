from __future__ import annotations

import inspect

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
from .. import agent_graph


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
    monkeypatch.setattr(agent_router, "SessionLocal", session_factory)
    monkeypatch.setattr(agent_router, "_start_agent_run", lambda run_id: None)
    app.dependency_overrides[security.require_admin] = lambda: {
        "sub": "p0-release-test-admin",
        "role": "admin",
    }
    try:
        response = client.post(
            "/api/agent/run",
            json={"message": "Create a private P0 approval smoke draft", "source_ids": []},
        )
        assert response.status_code == 202, response.text
        accepted = response.json()
        assert accepted["status"] == "queued"
        assert accepted["memory"] is None

        # Simulate the durable worker completing after the HTTP request has returned.
        agent_router._execute_agent_run(accepted["id"])
        state_response = client.get(f"/api/admin/agent/runs/{accepted['id']}")
        assert state_response.status_code == 200, state_response.text
        payload = state_response.json()
        assert payload["status"] == "completed"
        assert payload["memory"]["status"] == "pending"
        assert payload["memory"]["is_public"] is False

        memory_id = payload["memory"]["id"]
        publish_response = client.patch(
            f"/api/admin/brain/{memory_id}/publish",
            json={"publish_now": True},
        )
        assert publish_response.status_code == 409
        assert "must be approved" in publish_response.text.lower()

        with session_factory() as session:
            memory = session.query(models.AiMemoryBrain).filter_by(id=memory_id).one()
            assert memory.status == "pending"
            assert memory.is_public is False
            assert session.query(models.Post).count() == 0
    finally:
        app.dependency_overrides.pop(security.require_admin, None)


def test_agent_run_route_is_sync_for_fastapi_threadpool_execution() -> None:
    # The route executes a synchronous multi-step LLM graph. Declaring it async
    # would run that blocking graph on the event loop and stall health checks.
    assert not inspect.iscoroutinefunction(agent_router.run_agent)


def test_agent_graph_resumes_completed_step_checkpoints(
    isolated_agent_brain_db, monkeypatch: pytest.MonkeyPatch
) -> None:
    _, session_factory = isolated_agent_brain_db
    calls: list[str] = []

    def fake_generate(self, prompt: str, task: str | None = None):
        calls.append(str(task))
        return ('{"verdict":"pass","title":"resumed"}', "test/model")

    monkeypatch.setattr(agent_graph, "build_rag_context", lambda *args, **kwargs: "test evidence")
    monkeypatch.setattr(agent_graph, "wait_if_agent_paused", lambda _db: None)
    monkeypatch.setattr(agent_graph.LLMRouter, "generate_with_provider", fake_generate)

    with session_factory() as db:
        run = models.AgentRun(
            objective="resume a private draft",
            model="pending",
            input_context='{"message":"resume a private draft","source_ids":[]}',
            source_ids="[]",
            status="running",
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        db.add(models.AgentStep(
            run_id=run.id,
            step_order=1,
            agent="researcher",
            message="researcher completed",
            status="completed",
            provider="test",
            model="test/model",
            token_usage=7,
            output_json='{"claims":["persisted checkpoint"]}',
        ))
        db.commit()

        result = agent_graph.execute_content_graph(db, run, run.objective, [])
        assert result.final["agent_steps"]["researcher"]["claims"] == ["persisted checkpoint"]
        assert len(calls) == 5
        assert db.query(models.AgentStep).filter_by(run_id=run.id, status="completed").count() == 6
