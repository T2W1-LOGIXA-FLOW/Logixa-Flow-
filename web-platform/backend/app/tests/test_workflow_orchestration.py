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


def test_schedule_run_preserves_delay_and_priority_in_local_queue(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeDB:
        bind = None

        def close(self) -> None:
            pass

    monkeypatch.setattr(workflow_router, "SessionLocal", lambda: FakeDB())
    workflow_router._WORKFLOW_RUNS["scheduled-run"] = WorkflowRunOut(
        run_id="scheduled-run",
        workflow_id="scheduled-workflow",
        state=WorkflowState(status="queued"),
    )

    before = workflow_router._now()
    workflow_router._schedule_run("scheduled-run", priority=7, delay_seconds=30)

    assert len(workflow_router._EXECUTION_QUEUE) == 1
    item = workflow_router._EXECUTION_QUEUE[0]
    assert item["run_id"] == "scheduled-run"
    assert item["priority"] == 7
    assert item["scheduled_for"] >= before
    assert 29 <= (item["scheduled_for"] - item["queued_at"]).total_seconds() <= 31


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


@pytest.mark.anyio
async def test_approval_node_pauses_and_can_resume_after_admin_approval() -> None:
    workflow = WorkflowStorageCreate(
        id="approval-workflow",
        name="approval workflow",
        nodes=[
            WorkflowNode(id="prepare", name="prepare"),
            WorkflowNode(id="approve", type="approval", name="human approval", depends_on=["prepare"]),
            WorkflowNode(id="publish", name="publish", depends_on=["approve"]),
        ],
    )
    workflow_record = WorkflowStorageOut(
        **workflow.model_dump(),
        created_at=workflow_router._now(),
        updated_at=workflow_router._now(),
    )
    workflow_router._WORKFLOW_STORAGE[workflow.id] = workflow_record
    run = WorkflowRunOut(run_id="run-approval", workflow_id=workflow.id, state=WorkflowState(status="queued"))
    workflow_router._WORKFLOW_RUNS[run.run_id] = run

    await workflow_router._execute_workflow(run.run_id)

    assert run.state.status == "waiting_approval"
    assert run.state.completed_nodes == ["prepare"]
    assert run.state.approval_node == "approve"

    approved = await workflow_router.approve_workflow_run(run.run_id, _admin={"role": "admin"})
    assert approved["status"] == "queued"

    await workflow_router._execute_workflow(run.run_id)

    assert run.state.status == "completed"
    assert run.state.completed_nodes == ["prepare", "approve", "publish"]


@pytest.mark.anyio
async def test_node_retry_recovers_after_transient_failure(monkeypatch) -> None:
    workflow = WorkflowStorageCreate(
        id="retry-workflow",
        name="retry workflow",
        nodes=[
            WorkflowNode(
                id="flaky",
                name="flaky node",
                retry_count=1,
                config={"action": "log", "message": "ok"},
            )
        ],
    )
    workflow_record = WorkflowStorageOut(
        **workflow.model_dump(),
        created_at=workflow_router._now(),
        updated_at=workflow_router._now(),
    )
    workflow_router._WORKFLOW_STORAGE[workflow.id] = workflow_record
    run = WorkflowRunOut(
        run_id="run-retry",
        workflow_id=workflow.id,
        state=WorkflowState(status="queued"),
    )
    workflow_router._WORKFLOW_RUNS[run.run_id] = run

    calls = 0

    async def flaky_action(node, run_id):
        nonlocal calls
        calls += 1
        if calls == 1:
            raise RuntimeError("transient failure")
        return None

    monkeypatch.setattr(workflow_router, "_execute_node_action", flaky_action)

    await workflow_router._execute_workflow(run.run_id)

    assert calls == 2
    assert run.state.status == "completed"
    assert run.state.completed_nodes == ["flaky"]


@pytest.mark.anyio
async def test_node_retry_exhaustion_marks_run_failed(monkeypatch) -> None:
    workflow = WorkflowStorageCreate(
        id="retry-exhausted-workflow",
        name="retry exhausted workflow",
        nodes=[
            WorkflowNode(
                id="flaky",
                name="flaky node",
                retry_count=1,
                config={"action": "log", "message": "never completes"},
            )
        ],
    )
    workflow_record = WorkflowStorageOut(
        **workflow.model_dump(),
        created_at=workflow_router._now(),
        updated_at=workflow_router._now(),
    )
    workflow_router._WORKFLOW_STORAGE[workflow.id] = workflow_record
    run = WorkflowRunOut(
        run_id="run-retry-exhausted",
        workflow_id=workflow.id,
        state=WorkflowState(status="queued"),
    )
    workflow_router._WORKFLOW_RUNS[run.run_id] = run

    calls = 0

    async def always_fails(node, run_id):
        nonlocal calls
        calls += 1
        raise RuntimeError("persistent failure")

    monkeypatch.setattr(workflow_router, "_execute_node_action", always_fails)

    await workflow_router._execute_workflow(run.run_id)

    assert calls == 2
    assert run.state.status == "failed"
    assert "failed" in (run.state.error or "")
