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
async def test_failed_workflow_run_can_be_resumed_from_checkpoint(monkeypatch: pytest.MonkeyPatch) -> None:
    stored = await workflow.store_workflow(
        WorkflowStorageCreate(
            id="retry-flow",
            name="Retry flow",
            nodes=[
                WorkflowNode(id="first", name="First"),
                WorkflowNode(id="second", name="Second", depends_on=["first"]),
            ],
        ),
        _admin={"role": "admin"},
    )
    monkeypatch.setattr(workflow, "_dispatch_workflow_run", lambda run_id, delay_seconds=0: None)
    run = await workflow.run_workflow(
        "retry-flow",
        WorkflowRunRequest(workflow_id="retry-flow"),
        _admin={"role": "admin"},
    )
    run.state.status = "failed"
    run.state.completed_nodes = ["first"]
    run.state.error = "temporary downstream failure"
    workflow._persist_run_state(run)

    result = await workflow.retry_workflow_run(run.run_id, _admin={"role": "admin"})

    assert result["status"] == "queued"
    assert result["resumed_from_completed_nodes"] == ["first"]
    assert run.state.status == "queued"
    assert run.state.error is None
    assert workflow._EXECUTION_STATES[run.run_id]["completed_nodes"] == ["first"]
    assert any(item["run_id"] == run.run_id for item in workflow._EXECUTION_QUEUE)
    assert workflow._EXECUTION_HISTORY[run.run_id][-1].startswith("workflow retry requested")


@pytest.mark.anyio
async def test_retry_rejects_non_failed_workflow_run(monkeypatch: pytest.MonkeyPatch) -> None:
    await workflow.store_workflow(
        WorkflowStorageCreate(
            id="retry-conflict-flow",
            name="Retry conflict flow",
            nodes=[WorkflowNode(id="step", name="Step")],
        ),
        _admin={"role": "admin"},
    )
    monkeypatch.setattr(workflow, "_dispatch_workflow_run", lambda run_id, delay_seconds=0: None)
    run = await workflow.run_workflow(
        "retry-conflict-flow",
        WorkflowRunRequest(workflow_id="retry-conflict-flow"),
        _admin={"role": "admin"},
    )

    with pytest.raises(workflow.HTTPException) as exc:
        await workflow.retry_workflow_run(run.run_id, _admin={"role": "admin"})
    assert exc.value.status_code == 409


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


@pytest.mark.anyio
async def test_agent_node_runs_private_preview_and_records_run_ids(monkeypatch: pytest.MonkeyPatch) -> None:
    from app import database, integration_service

    class FakeSession:
        closed = False

        def close(self) -> None:
            self.closed = True

    fake_db = FakeSession()

    async def fake_preview(db, *, message=None, max_sources=8):
        assert db is fake_db
        assert message == "Create a supply chain insight draft for review."
        assert max_sources == 4
        return {"run_id": 91, "memory_id": 207, "source_count": 2}

    monkeypatch.setattr(database, "SessionLocal", lambda: fake_db)
    monkeypatch.setattr(integration_service, "run_preview_agent", fake_preview)
    node = WorkflowNode(
        id="thought-stream",
        type="agent",
        name="THOUGHT STREAM",
        config={
            "action": "run_agent",
            "message": "Create a supply chain insight draft for review.",
            "max_sources": 4,
        },
    )

    await workflow_execution._execute_agent_action(node, "workflow-agent-test")

    assert fake_db.closed is True
    assert workflow_execution._EXECUTION_METRICS["workflow-agent-test"]["agent_runs"] == [
        {
            "node_id": "thought-stream",
            "agent_run_id": 91,
            "memory_id": 207,
            "status": "completed",
        }
    ]
    assert "private_memory_id=207" in workflow_execution._EXECUTION_HISTORY["workflow-agent-test"][-1]
    assert "awaiting admin review" in workflow_execution._EXECUTION_HISTORY["workflow-agent-test"][-1]


@pytest.mark.anyio
async def test_agent_node_rejects_invalid_source_limit() -> None:
    node = WorkflowNode(
        id="thought-stream",
        type="agent",
        name="THOUGHT STREAM",
        config={"action": "run_agent", "message": "Create a supply chain insight draft for review.", "max_sources": 13},
    )
    with pytest.raises(ValueError, match="between 1 and 12"):
        await workflow_execution._execute_agent_action(node, "workflow-agent-invalid")


@pytest.mark.anyio
async def test_completed_run_state_restores_history_and_metrics_after_memory_loss() -> None:
    stored = await workflow.store_workflow(
        WorkflowStorageCreate(
            id="durable-state-flow",
            name="Durable state flow",
            nodes=[WorkflowNode(id="agent", name="THOUGHT STREAM", type="agent")],
        ),
        _admin={"role": "admin"},
    )
    run = await workflow.run_workflow(
        "durable-state-flow",
        WorkflowRunRequest(workflow_id="durable-state-flow"),
        _admin={"role": "admin"},
    )
    run.state.status = "completed"
    run.state.completed_nodes = ["agent"]
    workflow._EXECUTION_HISTORY[run.run_id] = [
        "agent:agent: completed agent_run_id=91; private_memory_id=207; awaiting admin review"
    ]
    workflow._EXECUTION_METRICS[run.run_id] = {
        "completed": 1,
        "total_nodes": 1,
        "agent_runs": [
            {"node_id": "agent", "agent_run_id": 91, "memory_id": 207, "status": "completed"}
        ],
    }
    workflow_persistence._persist_run_state(run)

    workflow._WORKFLOW_RUNS.clear()
    workflow._EXECUTION_STATES.clear()
    workflow._EXECUTION_HISTORY.clear()
    workflow._EXECUTION_METRICS.clear()

    state = await workflow.workflow_run_state(run.run_id, _admin={"role": "admin"})

    assert state["status"] == "completed"
    assert state["completed_nodes"] == ["agent"]
    assert "private_memory_id=207" in state["execution_history"][0]
    assert state["metrics"]["agent_runs"][0]["memory_id"] == 207
