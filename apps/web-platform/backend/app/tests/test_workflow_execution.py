from __future__ import annotations

import asyncio

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import models
from app.routers import workflow, workflow_execution, workflow_persistence
from app.schemas import WorkflowNode, WorkflowRunRequest, WorkflowState, WorkflowStorageCreate


@pytest.fixture(autouse=True)
def reset_workflow_execution_state(monkeypatch: pytest.MonkeyPatch) -> None:
    workflow._WORKFLOW_STORAGE.clear()
    workflow._WORKFLOW_RUNS.clear()
    workflow._SUBSCRIBERS.clear()
    workflow._RUN_TASKS.clear()
    workflow._EXECUTION_QUEUE.clear()
    workflow._ERROR_NOTIFICATIONS.clear()
    workflow._EXECUTION_STATES.clear()
    workflow._CONTROLLER_RUNS.clear()
    workflow_execution._QUEUE_WORKER_RUNNING = False
    engine = create_engine("sqlite:///:memory:")
    session_factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    models.Base.metadata.create_all(bind=engine)
    monkeypatch.setattr(workflow, "SessionLocal", session_factory)
    monkeypatch.setattr(workflow_persistence, "SessionLocal", session_factory)
    yield
    workflow._WORKFLOW_STORAGE.clear()
    workflow._WORKFLOW_RUNS.clear()
    workflow._SUBSCRIBERS.clear()
    workflow._RUN_TASKS.clear()
    workflow._EXECUTION_QUEUE.clear()
    workflow._ERROR_NOTIFICATIONS.clear()
    workflow._EXECUTION_STATES.clear()
    workflow_execution._QUEUE_WORKER_RUNNING = False
    engine.dispose()


@pytest.mark.anyio
async def test_workflow_executor_tracks_state_machine() -> None:
    stored = await workflow.store_workflow(
        WorkflowStorageCreate(
            id="executor-flow",
            name="Executor flow",
            nodes=[
                WorkflowNode(id="alpha", name="Alpha"),
                WorkflowNode(id="beta", name="Beta", depends_on=["alpha"]),
            ],
        ),
        _admin={"role": "admin"},
    )
    run = await workflow.run_workflow(
        "executor-flow",
        WorkflowRunRequest(workflow_id="executor-flow"),
        _admin={"role": "admin"},
    )

    executor = workflow.WorkflowExecutor(run.run_id, run.workflow_id, stored)
    assert executor.state.status == "queued"

    executor.mark_running()
    assert executor.state.status == "running"

    executor.state.completed_nodes = ["alpha"]
    executor.completed_nodes = {"alpha"}
    executor.state.current_node = "beta"
    executor.persist()

    state = workflow._EXECUTION_STATES[run.run_id]
    assert state["status"] == "running"
    assert state["current_node"] == "beta"


@pytest.mark.anyio
async def test_workflow_executor_runs_registered_actions() -> None:
    await workflow.store_workflow(
        WorkflowStorageCreate(
            id="async-flow",
            name="Async flow",
            nodes=[
                WorkflowNode(id="first", name="First", config={"action": "log", "message": "first"}),
                WorkflowNode(id="second", name="Second", config={"action": "set_metadata", "key": "done", "value": True}),
            ],
        ),
        _admin={"role": "admin"},
    )
    run = await workflow.run_workflow(
        "async-flow",
        WorkflowRunRequest(workflow_id="async-flow"),
        _admin={"role": "admin"},
    )
    workflow._WORKFLOW_RUNS[run.run_id] = run

    executor = workflow.WorkflowExecutor(run.run_id, run.workflow_id, workflow._WORKFLOW_STORAGE[run.workflow_id])
    final_state = await executor.execute()

    assert final_state.status == "completed"
    assert set(final_state.completed_nodes) == {"first", "second"}
    assert workflow._EXECUTION_METRICS[run.run_id]["metadata"]["done"] is True




@pytest.mark.anyio
async def test_workflow_state_recovery_and_cancellation() -> None:
    stored = await workflow.store_workflow(
        WorkflowStorageCreate(
            id="recover-flow",
            name="Recover flow",
            nodes=[WorkflowNode(id="step", name="Step")],
        ),
        _admin={"role": "admin"},
    )
    run = await workflow.run_workflow(
        "recover-flow",
        WorkflowRunRequest(workflow_id="recover-flow"),
        _admin={"role": "admin"},
    )

    state = await workflow.workflow_run_state(run.run_id, _admin={"role": "admin"})
    assert state["status"] == "queued"

    cancelled = await workflow.cancel_workflow_run(run.run_id, _admin={"role": "admin"})
    assert cancelled["status"] == "failed"
    assert workflow._EXECUTION_STATES[run.run_id]["status"] == "failed"

@pytest.mark.anyio
async def test_queue_claim_retries_transient_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    claim_attempts = 0
    sleep_delays: list[float] = []

    def flaky_claim(run_id: str) -> bool:
        nonlocal claim_attempts
        claim_attempts += 1
        assert run_id == "claim-retry-run"
        if claim_attempts == 1:
            raise RuntimeError("temporary database outage")
        return True

    async def fake_sleep(delay: float) -> None:
        sleep_delays.append(delay)

    monkeypatch.setattr(workflow_execution, "_claim_job", flaky_claim)
    monkeypatch.setattr(workflow_execution, "_queue_worker_sleep", fake_sleep)

    claimed = await asyncio.wait_for(workflow_execution._claim_job_with_retry("claim-retry-run"), timeout=5)

    assert claimed is True
    assert claim_attempts == 2
    assert sleep_delays == [1.0]



@pytest.mark.anyio
async def test_telegram_notification_requires_configured_delivery(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(workflow_execution, "telegram_configured", lambda: False)
    monkeypatch.setattr(workflow_execution, "telegram_enabled", lambda: True)

    node = WorkflowNode(
        id="telegram",
        type="notification",
        name="Telegram alert",
        config={"channel": "telegram", "message": "Do not report a dry run as delivered"},
    )
    with pytest.raises(RuntimeError, match="not configured and enabled"):
        await workflow_execution._execute_notification_action(node, "telegram-not-configured")


@pytest.mark.anyio
async def test_telegram_notification_fails_when_api_does_not_confirm_delivery(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(workflow_execution, "telegram_configured", lambda: True)
    monkeypatch.setattr(workflow_execution, "telegram_enabled", lambda: True)

    async def dry_run(*args, **kwargs):
        return None

    monkeypatch.setattr(workflow_execution, "send_telegram_message", dry_run)
    node = WorkflowNode(
        id="telegram",
        type="notification",
        name="Telegram alert",
        config={"channel": "telegram", "message": "test"},
    )
    with pytest.raises(RuntimeError, match="did not confirm notification delivery"):
        await workflow_execution._execute_notification_action(node, "telegram-dry-run")


@pytest.mark.anyio
async def test_telegram_notification_records_only_confirmed_delivery(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(workflow_execution, "telegram_configured", lambda: True)
    monkeypatch.setattr(workflow_execution, "telegram_enabled", lambda: True)
    captured = {}

    async def confirmed_delivery(message, *, topic_id=None):
        captured["message"] = message
        captured["topic_id"] = topic_id
        return {"ok": True, "result": {"message_id": 314}}

    monkeypatch.setattr(workflow_execution, "send_telegram_message", confirmed_delivery)
    node = WorkflowNode(
        id="telegram",
        type="notification",
        name="Telegram alert",
        config={"channel": "telegram", "message": "Cost < threshold", "topic_id": 7},
    )
    await workflow_execution._execute_notification_action(node, "telegram-confirmed")

    assert captured == {"message": "Cost &lt; threshold", "topic_id": 7}
    assert workflow_execution._EXECUTION_HISTORY["telegram-confirmed"][-1] == (
        "notification:telegram: telegram delivered (message_id=314)"
    )
