from __future__ import annotations

import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models, security
from app.database import Base, get_db
from app.main import app
from app.routers import agent as agent_router


@pytest.fixture
def retry_client(monkeypatch: pytest.MonkeyPatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    def override_db():
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_db
    retry_test_actor = "isolated-agent-retry-test-admin-" + uuid4().hex
    app.dependency_overrides[security.require_admin] = lambda: {
        "sub": retry_test_actor,
        "role": "admin",
    }
    started: list[int] = []
    monkeypatch.setattr(agent_router, "_start_agent_run", started.append)
    try:
        yield TestClient(app), session_factory, started
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(security.require_admin, None)
        Base.metadata.drop_all(engine)
        engine.dispose()


def test_failed_agent_run_can_be_retried_once_from_persisted_checkpoint(retry_client):
    client, session_factory, started = retry_client
    with session_factory() as db:
        run = models.AgentRun(
            objective="Retry isolated private draft",
            model="test-model",
            input_context='{"message":"Retry isolated private draft","source_ids":[]}',
            source_ids="[]",
            status="failed",
            retry_count=0,
        )
        db.add(run)
        db.flush()
        db.add_all([
            models.AgentStep(
                run_id=run.id,
                step_order=1,
                agent="researcher",
                message="researcher completed",
                status="completed",
                output_json='{"claims":["persisted evidence"]}',
            ),
            models.AgentStep(
                run_id=run.id,
                step_order=2,
                agent="analyst",
                message="analyst failed",
                status="failed",
                error="isolated transient failure",
            ),
        ])
        db.commit()
        run_id = run.id

    response = client.post(f"/api/admin/agent/runs/{run_id}/retry")
    assert response.status_code == 202, response.text
    payload = response.json()
    assert payload["id"] == run_id
    assert payload["status"] == "queued"
    assert payload["retry_count"] == 1
    assert payload["final_memory_id"] is None
    assert started == [run_id]

    with session_factory() as db:
        stored = db.query(models.AgentRun).filter_by(id=run_id).one()
        steps = db.query(models.AgentStep).filter_by(run_id=run_id).order_by(models.AgentStep.step_order).all()
        assert stored.status == "queued"
        assert stored.retry_count == 1
        assert [step.status for step in steps] == ["completed", "failed"]
        assert db.query(models.AiMemoryBrain).count() == 0

    second = client.post(f"/api/admin/agent/runs/{run_id}/retry")
    assert second.status_code == 409
    assert "failed runs" in second.text.lower() or "retry limit" in second.text.lower()
    assert started == [run_id]


@pytest.mark.parametrize(
    ("status", "retry_count", "final_memory_id", "expected_detail"),
    [
        ("running", 0, None, "only failed runs"),
        ("failed", 1, None, "retry limit"),
        ("failed", 0, 9876, "brain item"),
    ],
)
def test_retry_rejects_non_retryable_or_already_retried_runs(
    retry_client, status, retry_count, final_memory_id, expected_detail
):
    client, session_factory, _started = retry_client
    with session_factory() as db:
        run = models.AgentRun(
            objective="Do not duplicate this run",
            model="test-model",
            input_context="{}",
            source_ids="[]",
            status=status,
            retry_count=retry_count,
            final_memory_id=final_memory_id,
        )
        db.add(run)
        db.commit()
        run_id = run.id

    response = client.post(f"/api/admin/agent/runs/{run_id}/retry")
    assert response.status_code == 409
    assert expected_detail in response.text.lower()
    with session_factory() as db:
        stored = db.query(models.AgentRun).filter_by(id=run_id).one()
        assert stored.status == status
        assert stored.retry_count == retry_count
