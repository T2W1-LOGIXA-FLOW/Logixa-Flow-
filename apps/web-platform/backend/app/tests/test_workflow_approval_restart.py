from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import models
from app.routers import workflow, workflow_execution, workflow_persistence
from app.schemas import WorkflowNode, WorkflowRunRequest, WorkflowStorageCreate


@pytest.fixture
def isolated_workflow_db(monkeypatch: pytest.MonkeyPatch):
    workflow._WORKFLOW_STORAGE.clear()
    workflow._WORKFLOW_RUNS.clear()
    workflow._EXECUTION_QUEUE.clear()
    workflow._EXECUTION_STATES.clear()
    workflow._EXECUTION_HISTORY.clear()
    workflow._EXECUTION_METRICS.clear()
    workflow._CONTROLLER_RUNS.clear()
    workflow_execution._QUEUE_WORKER_RUNNING = False

    engine = create_engine("sqlite:///:memory:")
    session_factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    models.Base.metadata.create_all(bind=engine)
    monkeypatch.setattr(workflow, "SessionLocal", session_factory)
    monkeypatch.setattr(workflow_persistence, "SessionLocal", session_factory)
    yield
    engine.dispose()


@pytest.mark.anyio
async def test_unapproved_workflow_cannot_resume_and_approved_resume_survives_restart(
    isolated_workflow_db, monkeypatch: pytest.MonkeyPatch
) -> None:
    await workflow.store_workflow(
        WorkflowStorageCreate(
            id="approval-restart-e2e-flow",
            name="Approval restart E2E flow",
            nodes=[
                WorkflowNode(id="prepare", name="Prepare", config={"action": "log", "message": "prepared"}),
                WorkflowNode(id="approval", type="approval", name="Human approval", depends_on=["prepare"]),
                WorkflowNode(id="finish", name="Finish", depends_on=["approval"], config={"action": "log", "message": "finished"}),
            ],
        ),
        _admin={"role": "admin"},
    )
    run = await workflow.run_workflow(
        "approval-restart-e2e-flow",
        WorkflowRunRequest(workflow_id="approval-restart-e2e-flow", delay_seconds=60),
        _admin={"role": "admin"},
    )

    with pytest.raises(HTTPException) as not_awaiting_approval:
        await workflow.approve_workflow_run(run.run_id, _admin={"role": "admin"})
    assert not_awaiting_approval.value.status_code == 409

    await workflow._execute_workflow(run.run_id)
    assert run.state.status == "waiting_approval"
    assert run.state.completed_nodes == ["prepare"]
    assert run.state.approval_node == "approval"

    monkeypatch.setattr(workflow, "_dispatch_workflow_run", lambda *_args, **_kwargs: None)
    approved = await workflow.approve_workflow_run(run.run_id, _admin={"role": "admin"})
    assert approved == {
        "run_id": run.run_id,
        "status": "queued",
        "approved_node": "approval",
    }

    # Simulate a process restart: clear every in-memory state map, but keep DB.
    workflow._WORKFLOW_STORAGE.clear()
    workflow._WORKFLOW_RUNS.clear()
    workflow._EXECUTION_QUEUE.clear()
    workflow._EXECUTION_STATES.clear()
    workflow._EXECUTION_METRICS.clear()
    workflow._EXECUTION_HISTORY.clear()
    workflow_execution._QUEUE_WORKER_RUNNING = False

    assert workflow.restore_pending_workflow_runs() == 1
    restored = workflow._WORKFLOW_RUNS[run.run_id]
    assert restored.state.status == "queued"
    assert workflow._EXECUTION_METRICS[run.run_id]["approved_nodes"] == ["approval"]

    await workflow._execute_workflow(run.run_id)
    completed = workflow._load_run_state(run.run_id)
    assert completed is not None
    assert completed.state.status == "completed"
    assert completed.state.completed_nodes == ["prepare", "approval", "finish"]
    assert workflow._EXECUTION_HISTORY[run.run_id].count("task:prepare: prepared") == 1
    assert workflow._EXECUTION_HISTORY[run.run_id].count("task:finish: finished") == 1
