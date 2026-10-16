"""QStash delivery handler for workflow runs.

Receives signed QStash HTTP callbacks, verifies them, and executes (or skips
idempotently) the target workflow run. Imports shared state from the execution
and persistence sub-modules.
"""
from __future__ import annotations

import json
import logging
import os

from fastapi import APIRouter, HTTPException, Request, status

from app.routers.workflow_persistence import (
    _EXECUTION_STATES,
    _WORKFLOW_RUNS,
    _WORKFLOW_STORAGE,
    _load_run_state,
    _load_workflow_definition,
    _mark_job_terminal,
    _release_job_claim,
    _claim_job,
)
from app.routers.workflow_execution import _execute_workflow, _dispatch_workflow_run

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/qstash-dispatch", include_in_schema=False)
async def qstash_dispatch(request: Request) -> dict[str, str]:
    """Receive a signed QStash delivery and execute locally when Celery is disabled."""
    from qstash import Receiver

    signature = request.headers.get("Upstash-Signature", "")
    body = await request.body()
    current_key = os.getenv("QSTASH_CURRENT_SIGNING_KEY", "").strip()
    next_key = os.getenv("QSTASH_NEXT_SIGNING_KEY", "").strip()
    if not signature or not current_key or not next_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid QStash request")

    receiver = Receiver(current_signing_key=current_key, next_signing_key=next_key)
    try:
        destination = os.getenv("QSTASH_DESTINATION_URL", "").strip().rstrip("/")
        if not destination:
            raise ValueError("QSTASH_DESTINATION_URL is required for QStash verification")
        verification_url = f"{destination}/api/admin/workflow/qstash-dispatch"
        receiver.verify(
            body=body.decode("utf-8"),
            signature=signature,
            url=verification_url,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid QStash signature") from exc

    try:
        payload = json.loads(body.decode("utf-8"))
        run_id = str(payload.get("run_id", "")).strip()
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid workflow payload") from exc
    if not run_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing workflow run id")

    if run_id not in _WORKFLOW_RUNS:
        restored = _load_run_state(run_id)
        if restored is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow run not found")
        workflow = _load_workflow_definition(restored.workflow_id)
        if workflow is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow definition not found")
        _WORKFLOW_RUNS[run_id] = restored
        _WORKFLOW_STORAGE[workflow.id] = workflow
        _EXECUTION_STATES[run_id] = {
            "run_id": run_id,
            "workflow_id": restored.workflow_id,
            "status": restored.state.status,
            "current_node": restored.state.current_node,
            "completed_nodes": restored.state.completed_nodes,
            "error": restored.state.error,
            "approval_node": restored.state.approval_node,
        }

    # QStash can redeliver a message after a successful request. Terminal runs
    # must be idempotent: repair the durable job status (a prior process may have
    # persisted the run result but failed before updating the job) and never rerun
    # the workflow's side effects.
    run = _WORKFLOW_RUNS[run_id]
    if run.state.status in {"completed", "failed"}:
        try:
            _mark_job_terminal(run_id, run.state.status)
        except Exception as exc:
            logger.exception(
                "Failed to reconcile terminal workflow job on redelivery",
                extra={
                    "run_id": run_id,
                    "operation": "qstash_dispatch_terminal_reconcile",
                    "error_type": type(exc).__name__,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Workflow status is temporarily unavailable; delivery may be retried",
            ) from exc
        return {"status": run.state.status, "run_id": run_id}

    # Claim the durable scheduled job before execution. A fresh claim prevents
    # concurrent duplicate deliveries; an expired claim is reclaimed by the
    # same atomic helper used by the local recovery path.
    if not _claim_job(run_id):
        current = _load_run_state(run_id)
        if current is not None and current.state.status in {"completed", "failed"}:
            _WORKFLOW_RUNS[run_id] = current
            return {"status": current.state.status, "run_id": run_id}
        return {"status": "already_running", "run_id": run_id}

    if os.getenv("CELERY_ENABLED", "false").lower() == "true":
        from app.workers.tasks import execute_workflow_task
        execute_workflow_task.delay(run_id)
        return {"status": "queued", "run_id": run_id}

    # Free Render mode: keep execution inside the QStash request so QStash owns
    # retry/delivery and can wake the sleeping Web Service for scheduled runs.
    try:
        await _execute_workflow(run_id)
    except Exception as exc:
        # A process-level failure (for example, a persistence error) must not
        # leave the durable job claimed until the lease expires. Release our
        # claim before returning non-2xx so QStash can redeliver and resume from
        # the last persisted node checkpoint. The release itself can fail during
        # a database outage; preserve the retry signal in that case as well.
        logger.exception(
            "Workflow dispatch failed before a terminal result was recorded",
            extra={
                "run_id": run_id,
                "operation": "qstash_dispatch_execute",
                "error_type": type(exc).__name__,
            },
        )
        try:
            _release_job_claim(run_id)
        except Exception:
            logger.exception(
                "Failed to release workflow claim after dispatch error",
                extra={
                    "run_id": run_id,
                    "operation": "qstash_dispatch_release_claim",
                    "error_type": "database_failure",
                },
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Workflow execution is temporarily unavailable; delivery may be retried",
        ) from exc
    run = _WORKFLOW_RUNS.get(run_id)
    return {"status": run.state.status if run is not None else "completed", "run_id": run_id}
