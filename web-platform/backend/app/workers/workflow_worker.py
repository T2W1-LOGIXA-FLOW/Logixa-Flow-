from __future__ import annotations

import asyncio
import os
import socket
import time
from datetime import timedelta
from uuid import uuid4

from sqlalchemy import inspect

from app import models
from app.database import SessionLocal
from app.routers import workflow


def _worker_id() -> str:
    configured = os.getenv("WORKFLOW_WORKER_ID", "").strip()
    if configured:
        return configured
    return f"workflow-worker-{socket.gethostname()}-{os.getpid()}"


def _now():
    return models.utc_now()


def _recover_stale_jobs(db) -> int:
    stale_seconds = max(60, int(os.getenv("WORKFLOW_JOB_STALE_SECONDS", "900")))
    cutoff = _now() - timedelta(seconds=stale_seconds)
    jobs = (
        db.query(models.ScheduledWorkflowJob)
        .filter(
            models.ScheduledWorkflowJob.status == "running",
            models.ScheduledWorkflowJob.claimed_at.is_not(None),
            models.ScheduledWorkflowJob.claimed_at < cutoff,
        )
        .all()
    )
    for job in jobs:
        job.status = "queued"
        job.last_claimed_by = None
        job.claimed_at = None
        job.updated_at = _now()
    if jobs:
        db.commit()
    return len(jobs)


def _claim_next_job(worker_id: str) -> tuple[str, str] | None:
    db = SessionLocal()
    try:
        if not db.bind or not inspect(db.bind).has_table("scheduled_workflow_jobs"):
            return None

        with db.begin():
            job = (
                db.query(models.ScheduledWorkflowJob)
                .filter(
                    models.ScheduledWorkflowJob.status == "queued",
                    models.ScheduledWorkflowJob.scheduled_for <= _now(),
                )
                .order_by(
                    models.ScheduledWorkflowJob.priority.desc(),
                    models.ScheduledWorkflowJob.scheduled_for.asc(),
                    models.ScheduledWorkflowJob.created_at.asc(),
                )
                .with_for_update(skip_locked=True)
                .first()
            )
            if job is None:
                return None

            job.status = "running"
            job.attempt_count = int(job.attempt_count or 0) + 1
            job.last_claimed_by = worker_id
            job.claimed_at = _now()
            job.updated_at = _now()
            return job.run_id, job.workflow_id
    finally:
        db.close()


def _load_job(run_id: str, workflow_id: str) -> tuple[models.WorkflowRunRecord | None, object | None]:
    db = SessionLocal()
    try:
        run_record = db.query(models.WorkflowRunRecord).filter(models.WorkflowRunRecord.id == run_id).first()
        workflow_record = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
        return run_record, workflow_record
    finally:
        db.close()


async def _execute_claimed(run_id: str, workflow_id: str) -> None:
    run = workflow._load_run_state(run_id)
    definition = workflow._load_workflow_definition(workflow_id)
    if run is None or definition is None:
        workflow._mark_job_terminal(run_id, "failed")
        return

    workflow._WORKFLOW_RUNS[run_id] = run
    workflow._WORKFLOW_STORAGE[workflow_id] = definition
    workflow._EXECUTION_STATES[run_id] = {
        "run_id": run.run_id,
        "workflow_id": run.workflow_id,
        "status": run.state.status,
        "current_node": run.state.current_node,
        "completed_nodes": run.state.completed_nodes,
        "error": run.state.error,
        "approval_node": run.state.approval_node,
    }

    executor = workflow.WorkflowExecutor(run_id, workflow_id, definition)
    executor.state = run.state
    try:
        final_state = await executor.execute()
        run.state = final_state
        if final_state.status == "waiting_approval":
            workflow._mark_job_terminal(run_id, "waiting_approval")
        elif final_state.status in {"completed", "failed"}:
            workflow._mark_job_terminal(run_id, final_state.status)
        else:
            workflow._mark_job_terminal(run_id, "queued")
    except asyncio.CancelledError:
        executor.state.status = "failed"
        executor.state.error = "workflow worker task cancelled"
        executor.persist()
        workflow._mark_job_terminal(run_id, "failed")
        raise
    except Exception as exc:
        executor.state.status = "failed"
        executor.state.error = str(exc)[:1000]
        executor.persist()
        workflow._mark_job_terminal(run_id, "failed")


async def run_worker() -> None:
    worker_id = _worker_id()
    poll_seconds = max(1, int(os.getenv("WORKFLOW_WORKER_POLL_SECONDS", "3")))
    print(f"[workflow-worker] started id={worker_id} poll={poll_seconds}s", flush=True)

    while True:
        db = SessionLocal()
        try:
            _recover_stale_jobs(db)
        finally:
            db.close()

        claimed = _claim_next_job(worker_id)
        if claimed is None:
            await asyncio.sleep(poll_seconds)
            continue

        run_id, workflow_id = claimed
        print(f"[workflow-worker] claimed run={run_id} workflow={workflow_id}", flush=True)
        await _execute_claimed(run_id, workflow_id)


if __name__ == "__main__":
    asyncio.run(run_worker())
