"""Workflow router — thin orchestration layer.

This module is intentionally kept small. All heavy logic lives in dedicated
sub-modules that are independently testable:

- ``workflow_persistence``  — DB read/write helpers and shared in-process state
- ``workflow_execution``    — WorkflowExecutor, node actions, queue worker
- ``workflow_websocket``    — WebSocket telemetry & authentication
- ``workflow_qstash``       — QStash signed-delivery endpoint

The ``router`` exported from this module is what ``app/main.py`` includes.
"""
from __future__ import annotations

from datetime import timedelta
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import inspect

from app.database import SessionLocal
from app import models
from app.schemas import (
    WorkflowRunOut,
    WorkflowRunRequest,
    WorkflowState,
    WorkflowStorageCreate,
    WorkflowStorageOut,
)
from app.security import require_admin

# Sub-module imports
from app.routers import workflow_persistence, workflow_execution
from app.routers.workflow_persistence import (
    _CONTROLLER_RUNS,
    _EXECUTION_HISTORY,
    _EXECUTION_METRICS,
    _EXECUTION_STATES,
    _WORKFLOW_RUNS,
    _WORKFLOW_STORAGE,
    _load_run_state,
    _load_workflow_definition,
    _mark_job_terminal,
    _now,
    _persist_run_state,
    _persist_workflow_definition,
    _record_controller_result,
    _schedule_run,
    restore_pending_workflow_runs,
)
from app.routers.workflow_execution import (
    WorkflowExecutor,
    _dispatch_workflow_run,
    _sync_execution_metrics,
    _EXECUTION_QUEUE,
    _ERROR_NOTIFICATIONS,
    _SUBSCRIBERS,
    _RUN_TASKS,
    _WORKER_ID,
    _queue_worker,
    start_queue_worker,
)
from app.routers import workflow_qstash
from app.routers import workflow_websocket

# Backwards-compatible exports for tests and internal callers during the router split.
_verify_supabase_token = workflow_websocket._verify_supabase_token
_WEBSOCKET_AUTH_TIMEOUT_SECONDS = workflow_websocket._WEBSOCKET_AUTH_TIMEOUT_SECONDS
_WEBSOCKET_AUTH_RECHECK_SECONDS = workflow_websocket._WEBSOCKET_AUTH_RECHECK_SECONDS
workflow_telemetry = workflow_websocket.workflow_telemetry
qstash_dispatch = workflow_qstash.qstash_dispatch
_execute_workflow = workflow_execution._execute_workflow
_claim_job = workflow_persistence._claim_job
_record_execution_history = workflow_persistence._record_execution_history
_sync_execution_metrics = workflow_persistence._sync_execution_metrics
_QUEUE_WORKER_RUNNING = workflow_execution._QUEUE_WORKER_RUNNING

# ---------------------------------------------------------------------------
# Main router — all HTTP routes assembled here
# ---------------------------------------------------------------------------
router = APIRouter(prefix="/api/admin/workflow", tags=["admin", "workflow"])

# Mount sub-routers (no additional prefix — they inherit the parent prefix)
router.include_router(workflow_qstash.router)
router.include_router(workflow_websocket.router)


# ---------------------------------------------------------------------------
# CRUD — workflow definitions
# ---------------------------------------------------------------------------

@router.get("/queue")
async def workflow_queue(_admin=Depends(require_admin)) -> dict[str, Any]:
    return {"queued": [item["run_id"] for item in _EXECUTION_QUEUE], "notifications": _ERROR_NOTIFICATIONS[-10:]}


@router.post("", response_model=WorkflowStorageOut, status_code=status.HTTP_201_CREATED)
async def store_workflow(payload: WorkflowStorageCreate, _admin=Depends(require_admin)) -> WorkflowStorageOut:
    timestamp = _now()
    existing = _WORKFLOW_STORAGE.get(payload.id)
    workflow = WorkflowStorageOut(
        **payload.model_dump(),
        created_at=existing.created_at if existing else timestamp,
        updated_at=timestamp,
    )
    _WORKFLOW_STORAGE[payload.id] = workflow
    _persist_workflow_definition(workflow)
    return workflow


@router.get("/{workflow_id}", response_model=WorkflowStorageOut)
async def retrieve_workflow(workflow_id: str, _admin=Depends(require_admin)) -> WorkflowStorageOut:
    workflow = _WORKFLOW_STORAGE.get(workflow_id)
    if workflow is None:
        workflow = _load_workflow_definition(workflow_id)
    if workflow is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="workflow not found")
    _WORKFLOW_STORAGE[workflow_id] = workflow
    return workflow


# ---------------------------------------------------------------------------
# Run lifecycle
# ---------------------------------------------------------------------------

async def enqueue_workflow_run(
    workflow_id: str,
    priority: int = 1,
    delay_seconds: int = 0,
    controller_id: str | None = None,
) -> WorkflowRunOut:
    workflow = _WORKFLOW_STORAGE.get(workflow_id) or _load_workflow_definition(workflow_id)
    if workflow is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="workflow not found")
    _WORKFLOW_STORAGE[workflow_id] = workflow
    run = WorkflowRunOut(run_id=f"run-{uuid4().hex}", workflow_id=workflow_id, state=WorkflowState(status="queued"))
    _WORKFLOW_RUNS[run.run_id] = run
    _EXECUTION_STATES[run.run_id] = {
        "run_id": run.run_id,
        "workflow_id": workflow_id,
        "status": "queued",
        "current_node": None,
        "completed_nodes": [],
        "error": None,
    }
    _sync_execution_metrics(run.run_id, workflow, run.state)
    _persist_run_state(run)
    if controller_id:
        _CONTROLLER_RUNS[run.run_id] = controller_id
    _schedule_run(run.run_id, priority=priority, delay_seconds=delay_seconds)
    _dispatch_workflow_run(run.run_id, delay_seconds=delay_seconds)
    return run


@router.post("/{workflow_id}/runs", response_model=WorkflowRunOut, status_code=status.HTTP_202_ACCEPTED)
async def run_workflow(workflow_id: str, payload: WorkflowRunRequest, _admin=Depends(require_admin)) -> WorkflowRunOut:
    if payload.workflow_id != workflow_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="workflow_id does not match path")
    return await enqueue_workflow_run(workflow_id, priority=payload.priority, delay_seconds=payload.delay_seconds)


@router.get("/runs/{run_id}/state")
async def workflow_run_state(run_id: str, _admin=Depends(require_admin)) -> dict[str, Any]:
    run = _WORKFLOW_RUNS.get(run_id)
    if run is None:
        # Completed runs may no longer be in process memory after a backend restart.
        run = _load_run_state(run_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="run not found")
    return {
        "run_id": run.run_id,
        "workflow_id": run.workflow_id,
        "status": run.state.status,
        "current_node": run.state.current_node,
        "completed_nodes": run.state.completed_nodes,
        "error": run.state.error,
        "approval_node": run.state.approval_node,
        "execution_history": _EXECUTION_HISTORY.get(run_id, []),
        "metrics": _EXECUTION_METRICS.get(run_id, {}),
    }


@router.post("/runs/{run_id}/cancel")
async def cancel_workflow_run(run_id: str, _admin=Depends(require_admin)) -> dict[str, str]:
    run = _WORKFLOW_RUNS.get(run_id) or _load_run_state(run_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="run not found")
    workflow = _WORKFLOW_STORAGE.get(run.workflow_id) or _load_workflow_definition(run.workflow_id)
    if workflow is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="workflow not found")

    _WORKFLOW_RUNS[run_id] = run
    _WORKFLOW_STORAGE[run.workflow_id] = workflow
    executor = WorkflowExecutor(run_id, run.workflow_id, workflow)
    executor.state = run.state
    executor.cancel("workflow execution cancelled")
    run.state = executor.state
    _EXECUTION_STATES[run_id] = executor.snapshot()
    _mark_job_terminal(run_id, run.state.status)
    _record_controller_result(run_id, run.state.status)
    return {"run_id": run_id, "status": run.state.status}


@router.post("/runs/{run_id}/retry")
async def retry_workflow_run(run_id: str, _admin=Depends(require_admin)) -> dict[str, Any]:
    """Resume a failed run from its last persisted completed-node checkpoint."""
    run = _WORKFLOW_RUNS.get(run_id) or _load_run_state(run_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="workflow run not found")
    if run.state.status != "failed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="only failed workflow runs can be retried",
        )

    workflow = _WORKFLOW_STORAGE.get(run.workflow_id) or _load_workflow_definition(run.workflow_id)
    if workflow is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="workflow not found")

    # Keep completed_nodes as the durable checkpoint; the executor resumes at
    # the first unfinished node. Reset only the transient failed-run fields.
    run.state.status = "queued"
    run.state.current_node = None
    run.state.error = None
    run.state.approval_node = None
    _WORKFLOW_RUNS[run_id] = run
    _WORKFLOW_STORAGE[run.workflow_id] = workflow
    _EXECUTION_STATES[run_id] = {
        "run_id": run_id,
        "workflow_id": run.workflow_id,
        "status": "queued",
        "current_node": None,
        "completed_nodes": list(run.state.completed_nodes),
        "error": None,
        "approval_node": None,
    }
    _sync_execution_metrics(run_id, workflow, run.state)
    _persist_run_state(run)

    priority = 1
    db = SessionLocal()
    try:
        if db.bind and inspect(db.bind).has_table("scheduled_workflow_jobs"):
            job = db.query(models.ScheduledWorkflowJob).filter(
                models.ScheduledWorkflowJob.run_id == run_id
            ).first()
            if job is not None:
                priority = int(job.priority)
    finally:
        db.close()

    _schedule_run(run_id, priority=priority, delay_seconds=0)
    _dispatch_workflow_run(run_id, delay_seconds=0)
    _record_execution_history(run_id, "workflow retry requested; resuming from last completed-node checkpoint")
    return {
        "run_id": run_id,
        "status": "queued",
        "resumed_from_completed_nodes": list(run.state.completed_nodes),
    }


@router.post("/runs/{run_id}/approve")
async def approve_workflow_run(run_id: str, node_id: str | None = None, _admin=Depends(require_admin)) -> dict[str, Any]:
    run = _WORKFLOW_RUNS.get(run_id) or _load_run_state(run_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="workflow run not found")
    if run.state.status != "waiting_approval":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="workflow run is not waiting for approval")
    workflow = _WORKFLOW_STORAGE.get(run.workflow_id) or _load_workflow_definition(run.workflow_id)
    if workflow is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="workflow not found")
    approval_id = node_id or run.state.approval_node
    node = next((item for item in workflow.nodes if item.id == approval_id and item.type == "approval"), None)
    if node is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="approval node not found")
    metrics = _EXECUTION_METRICS.setdefault(run.run_id, {})
    approved_nodes = set(metrics.get("approved_nodes", []))
    approved_nodes.add(node.id)
    metrics["approved_nodes"] = sorted(approved_nodes)
    _WORKFLOW_RUNS[run.run_id] = run
    run.state.status = "queued"
    run.state.current_node = node.id
    run.state.approval_node = None
    run.state.error = None
    _persist_run_state(run)
    priority = 1
    db = SessionLocal()
    try:
        if db.bind and inspect(db.bind).has_table("scheduled_workflow_jobs"):
            job = db.query(models.ScheduledWorkflowJob).filter(models.ScheduledWorkflowJob.run_id == run.run_id).first()
            priority = int(job.priority) if job is not None else 1
            if job is not None:
                job.status = "queued"
                job.updated_at = _now()
                db.commit()
    finally:
        db.close()
    _dispatch_workflow_run(run.run_id, delay_seconds=0)
    return {"run_id": run.run_id, "status": "queued", "approved_node": node.id}


# Re-export for callers that import from this module (e.g. controllers router)
__all__ = ["router", "enqueue_workflow_run", "restore_pending_workflow_runs", "start_queue_worker"]
