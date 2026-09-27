from __future__ import annotations

import asyncio
import json

import pytest
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

from app import models
from app.routers import workflow
from app.schemas import WorkflowNode, WorkflowRunRequest, WorkflowStorageCreate


@pytest.fixture(autouse=True)
def reset_persistence_state(monkeypatch: pytest.MonkeyPatch) -> None:
    workflow._WORKFLOW_STORAGE.clear()
    workflow._WORKFLOW_RUNS.clear()
    workflow._SUBSCRIBERS.clear()
    workflow._RUN_TASKS.clear()
    workflow._EXECUTION_QUEUE.clear()
    workflow._ERROR_NOTIFICATIONS.clear()
    workflow._EXECUTION_STATES.clear()
    workflow._EXECUTION_HISTORY.clear()
    workflow._EXECUTION_METRICS.clear()
    workflow._CONTROLLER_RUNS.clear()
    workflow._QUEUE_WORKER_RUNNING = False

    engine = create_engine("sqlite:///:memory:")
    session_factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    models.Base.metadata.create_all(bind=engine)
    monkeypatch.setattr(workflow, "SessionLocal", session_factory)
    yield
    workflow._WORKFLOW_STORAGE.clear()
    workflow._WORKFLOW_RUNS.clear()
    workflow._SUBSCRIBERS.clear()
    workflow._RUN_TASKS.clear()
    workflow._EXECUTION_QUEUE.clear()
    workflow._ERROR_NOTIFICATIONS.clear()
    workflow._EXECUTION_STATES.clear()
    workflow._EXECUTION_HISTORY.clear()
    workflow._EXECUTION_METRICS.clear()
    workflow._QUEUE_WORKER_RUNNING = False


@pytest.mark.anyio
async def test_database_schema_exists() -> None:
    db = workflow.SessionLocal()
    try:
        inspector = inspect(db.bind)
        tables = set(inspector.get_table_names())
        assert "workflows" in tables
        assert "workflow_nodes" in tables
        assert "workflow_runs" in tables
        assert "scheduled_workflow_jobs" in tables
    finally:
        db.close()


@pytest.mark.anyio
async def test_workflow_state_persists_to_database() -> None:
    workflow_payload = WorkflowStorageCreate(
        id="persisted-flow",
        name="Persisted Flow",
        nodes=[WorkflowNode(id="alpha", name="Alpha"), WorkflowNode(id="beta", name="Beta", depends_on=["alpha"])],
    )
    await workflow.store_workflow(workflow_payload, _admin={"role": "admin"})

    persisted = workflow._load_workflow_definition("persisted-flow")
    assert persisted is not None
    assert persisted.name == "Persisted Flow"
    assert [node.id for node in persisted.nodes] == ["alpha", "beta"]

    run = await workflow.run_workflow(
        "persisted-flow",
        WorkflowRunRequest(workflow_id="persisted-flow"),
        _admin={"role": "admin"},
    )
    await asyncio.sleep(0.1)

    loaded = workflow._load_run_state(run.run_id)
    assert loaded is not None
    assert loaded.workflow_id == "persisted-flow"
    assert loaded.state.status in {"queued", "running", "completed", "failed"}


@pytest.mark.anyio
async def test_execution_history_tracks_run_logs() -> None:
    workflow_payload = WorkflowStorageCreate(
        id="history-flow",
        name="History Flow",
        nodes=[WorkflowNode(id="task", name="Task")],
    )
    await workflow.store_workflow(workflow_payload, _admin={"role": "admin"})
    run = await workflow.run_workflow(
        "history-flow",
        WorkflowRunRequest(workflow_id="history-flow"),
        _admin={"role": "admin"},
    )
    workflow._record_execution_history(run.run_id, "task executed")
    db = workflow.SessionLocal()
    try:
        record = db.query(models.WorkflowRunRecord).filter(models.WorkflowRunRecord.id == run.run_id).first()
        assert record is not None
        logs = json.loads(record.execution_log or "[]")
        assert "task executed" in logs
    finally:
        db.close()


@pytest.mark.anyio
async def test_pending_workflow_jobs_restore_after_restart() -> None:
    await workflow.store_workflow(
        WorkflowStorageCreate(
            id="restart-flow",
            name="Restart Flow",
            nodes=[WorkflowNode(id="step", name="Step", config={"action": "log", "message": "recovered"})],
        ),
        _admin={"role": "admin"},
    )
    run = await workflow.run_workflow(
        "restart-flow",
        WorkflowRunRequest(workflow_id="restart-flow", delay_seconds=60),
        _admin={"role": "admin"},
    )

    workflow._WORKFLOW_STORAGE.clear()
    workflow._WORKFLOW_RUNS.clear()
    workflow._EXECUTION_QUEUE.clear()
    workflow._EXECUTION_STATES.clear()
    workflow._QUEUE_WORKER_RUNNING = False

    restored = workflow.restore_pending_workflow_runs()

    assert restored == 1
    assert run.run_id in workflow._WORKFLOW_RUNS
    assert workflow._EXECUTION_QUEUE[0]["run_id"] == run.run_id


@pytest.mark.anyio
async def test_controller_result_tracks_workflow_terminal_state() -> None:
    db = workflow.SessionLocal()
    try:
        db.add(models.Controller(
            id="controller-test",
            name="Controller Test",
            trigger_type="manual",
            enabled=True,
            config='{"workflow_id":"controller-flow"}',
            success_count=0,
            failure_count=0,
        ))
        db.commit()
    finally:
        db.close()

    await workflow.store_workflow(
        WorkflowStorageCreate(
            id="controller-flow",
            name="Controller Flow",
            nodes=[WorkflowNode(id="step", name="Step", config={"action": "log", "message": "ok"})],
        ),
        _admin={"role": "admin"},
    )

    workflow._QUEUE_WORKER_RUNNING = True
    run = await workflow.enqueue_workflow_run("controller-flow", controller_id="controller-test")
    await workflow._execute_workflow(run.run_id)

    db = workflow.SessionLocal()
    try:
        controller = db.query(models.Controller).filter(models.Controller.id == "controller-test").first()
        assert controller is not None
        assert controller.success_count == 1
        assert controller.failure_count == 0
    finally:
        db.close()
