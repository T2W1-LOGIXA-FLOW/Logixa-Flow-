from __future__ import annotations

import asyncio

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import models
from app.routers import workflow
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
    workflow._QUEUE_WORKER_RUNNING = False
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
async def test_queue_worker_retries_transient_claim_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    run = workflow.WorkflowRunOut(
        run_id="claim-retry-run",
        workflow_id="claim-retry-flow",
        state=WorkflowState(status="queued"),
    )
    workflow._WORKFLOW_RUNS[run.run_id] = run
    now = workflow._now()
    workflow._EXECUTION_QUEUE.append(
        {
            "run_id": run.run_id,
            "priority": 1,
            "queued_at": now,
            "scheduled_for": now,
        }
    )

    claim_attempts = 0
    sleep_delays: list[float] = []
    executed: list[str] = []

    def flaky_claim(run_id: str) -> bool:
        nonlocal claim_attempts
        claim_attempts += 1
        if claim_attempts == 1:
            raise RuntimeError("temporary database outage")
        assert run_id == run.run_id
        return True

    async def fake_sleep(delay: float) -> None:
        sleep_delays.append(delay)

    async def fake_execute(run_id: str) -> None:
        executed.append(run_id)
        run.state.status = "completed"

    monkeypatch.setattr(workflow, "_claim_job", flaky_claim)
    monkeypatch.setattr(workflow, "_execute_workflow", fake_execute)
    # Scope the global asyncio.sleep patch to the queue-worker call only so
    # the test runner and task gathering retain real event-loop scheduling.
    with monkeypatch.context() as sleep_patch:
        sleep_patch.setattr(workflow.asyncio, "sleep", fake_sleep)
        await workflow._queue_worker()

    tasks = list(workflow._RUN_TASKS)
    if tasks:
        await asyncio.gather(*tasks)

    assert claim_attempts == 2
    assert sleep_delays == [1.0]
    assert executed == [run.run_id]
    assert workflow._EXECUTION_QUEUE == []

