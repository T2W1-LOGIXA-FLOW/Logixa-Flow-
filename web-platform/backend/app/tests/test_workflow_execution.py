from __future__ import annotations

import asyncio

import pytest

from app.routers import workflow
from app.schemas import WorkflowNode, WorkflowRunRequest, WorkflowState, WorkflowStorageCreate


@pytest.fixture(autouse=True)
def reset_workflow_execution_state() -> None:
    workflow._WORKFLOW_STORAGE.clear()
    workflow._WORKFLOW_RUNS.clear()
    workflow._SUBSCRIBERS.clear()
    workflow._RUN_TASKS.clear()
    workflow._EXECUTION_QUEUE.clear()
    workflow._ERROR_NOTIFICATIONS.clear()
    workflow._EXECUTION_STATES.clear()
    workflow._CONTROLLER_RUNS.clear()
    workflow._QUEUE_WORKER_RUNNING = False
    yield
    workflow._WORKFLOW_STORAGE.clear()
    workflow._WORKFLOW_RUNS.clear()
    workflow._SUBSCRIBERS.clear()
    workflow._RUN_TASKS.clear()
    workflow._EXECUTION_QUEUE.clear()
    workflow._ERROR_NOTIFICATIONS.clear()
    workflow._EXECUTION_STATES.clear()
    workflow._QUEUE_WORKER_RUNNING = False


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
