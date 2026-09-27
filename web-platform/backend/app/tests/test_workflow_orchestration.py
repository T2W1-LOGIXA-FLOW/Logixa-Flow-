from __future__ import annotations

import asyncio

import pytest

from app.routers import workflow as workflow_router
from app.schemas import WorkflowNode, WorkflowRunOut, WorkflowState, WorkflowStorageCreate, WorkflowStorageOut


@pytest.fixture(autouse=True)
def reset_workflow_state() -> None:
    workflow_router._WORKFLOW_STORAGE.clear()
    workflow_router._WORKFLOW_RUNS.clear()
    workflow_router._SUBSCRIBERS.clear()
    workflow_router._RUN_TASKS.clear()
    workflow_router._EXECUTION_QUEUE.clear()
    workflow_router._ERROR_NOTIFICATIONS.clear()
    workflow_router._QUEUE_WORKER_RUNNING = False
    workflow_router._CONTROLLER_RUNS.clear()
    yield
    workflow_router._WORKFLOW_STORAGE.clear()
    workflow_router._WORKFLOW_RUNS.clear()
    workflow_router._SUBSCRIBERS.clear()
    workflow_router._RUN_TASKS.clear()
    workflow_router._EXECUTION_QUEUE.clear()
    workflow_router._ERROR_NOTIFICATIONS.clear()
    workflow_router._QUEUE_WORKER_RUNNING = False


@pytest.mark.anyio
async def test_execution_queue_prioritizes_jobs() -> None:
    low = {"run_id": "run-low", "priority": 1, "scheduled_for": workflow_router._now(), "queued_at": workflow_router._now()}
    high = {"run_id": "run-high", "priority": 9, "scheduled_for": workflow_router._now(), "queued_at": workflow_router._now()}

    workflow_router._EXECUTION_QUEUE.extend([low, high])
    workflow_router._EXECUTION_QUEUE.sort(key=lambda item: (-int(item["priority"]), item["scheduled_for"], item["queued_at"]))

    assert workflow_router._EXECUTION_QUEUE[0]["run_id"] == "run-high"
    assert workflow_router._EXECUTION_QUEUE[1]["run_id"] == "run-low"


@pytest.mark.anyio
async def test_node_dependencies_and_registered_actions() -> None:
    workflow = WorkflowStorageCreate(
        id="action-workflow",
        name="action workflow",
        nodes=[
            WorkflowNode(id="first", name="first node", config={"action": "log", "message": "ok"}),
            WorkflowNode(id="second", name="second node", depends_on=["first"], config={"action": "set_metadata", "key": "attempt", "value": 2}),
        ],
    )
    workflow_record = WorkflowStorageOut(
        **workflow.model_dump(),
        created_at=workflow_router._now(),
        updated_at=workflow_router._now(),
    )
    workflow_router._WORKFLOW_STORAGE[workflow.id] = workflow_record
    run = WorkflowRunOut(run_id="run-action", workflow_id=workflow.id, state=WorkflowState(status="queued"))
    workflow_router._WORKFLOW_RUNS[run.run_id] = run

    await workflow_router._execute_workflow(run.run_id)

    assert run.state.status == "completed"
    assert run.state.completed_nodes == ["first", "second"]
    assert workflow_router._EXECUTION_METRICS[run.run_id]["metadata"]["attempt"] == 2




@pytest.mark.anyio
async def test_error_handling_rolls_back_failed_run() -> None:
    workflow = WorkflowStorageCreate(
        id="broken-workflow",
        name="broken workflow",
        nodes=[
            WorkflowNode(id="first", name="first node", config={"action": "unsupported"}),
            WorkflowNode(id="second", name="second node", depends_on=["first"]),
        ],
    )

    workflow_record = WorkflowStorageOut(
        **workflow.model_dump(),
        created_at=workflow_router._now(),
        updated_at=workflow_router._now(),
    )
    workflow_router._WORKFLOW_STORAGE[workflow.id] = workflow_record
    run = WorkflowRunOut(run_id="run-failure", workflow_id=workflow.id, state=WorkflowState(status="queued"))
    workflow_router._WORKFLOW_RUNS[run.run_id] = run

    await workflow_router._execute_workflow(run.run_id)

    assert run.state.status == "failed"
    assert run.state.completed_nodes == []
    assert workflow_router._ERROR_NOTIFICATIONS[-1]["message"]
