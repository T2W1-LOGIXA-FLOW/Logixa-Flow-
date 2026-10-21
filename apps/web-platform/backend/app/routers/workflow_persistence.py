"""Workflow persistence helpers.

All database read/write operations for workflow definitions and run states
are collected here. The rest of the workflow router imports from this module
so that storage concerns stay isolated and independently testable.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import inspect
from sqlalchemy.exc import SQLAlchemyError

from app import models
from app.database import SessionLocal
from app.schemas import (
    WorkflowNode,
    WorkflowRunOut,
    WorkflowState,
    WorkflowStorageOut,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Shared in-process state stores (imported by other workflow sub-modules)
# ---------------------------------------------------------------------------
_WORKFLOW_STORAGE: dict[str, WorkflowStorageOut] = {}
_WORKFLOW_RUNS: dict[str, WorkflowRunOut] = {}
_EXECUTION_QUEUE: list[dict[str, Any]] = []
_ERROR_NOTIFICATIONS: list[dict[str, str]] = []
_EXECUTION_STATES: dict[str, dict[str, Any]] = {}
_EXECUTION_HISTORY: dict[str, list[str]] = {}
_EXECUTION_METRICS: dict[str, dict[str, Any]] = {}
_CONTROLLER_RUNS: dict[str, str] = {}


# ---------------------------------------------------------------------------
# Time helpers
# ---------------------------------------------------------------------------

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


# ---------------------------------------------------------------------------
# JSON helpers
# ---------------------------------------------------------------------------

def _serialize_json(value: Any) -> str:
    return json.dumps(value, separators=(",", ":"))


# ---------------------------------------------------------------------------
# Workflow definition persistence
# ---------------------------------------------------------------------------

def _persist_workflow_definition(workflow: WorkflowStorageOut) -> None:
    db = SessionLocal()
    try:
        record = db.query(models.Workflow).filter(models.Workflow.id == workflow.id).first()
        if record is None:
            record = models.Workflow(id=workflow.id, name=workflow.name, description="")
            db.add(record)
        record.name = workflow.name
        record.description = ""
        record.updated_at = _now()

        db.query(models.WorkflowNodeRecord).filter(models.WorkflowNodeRecord.workflow_id == workflow.id).delete()
        for node in workflow.nodes:
            db.add(
                models.WorkflowNodeRecord(
                    workflow_id=workflow.id,
                    node_id=node.id,
                    node_type=node.type,
                    name=node.name,
                    depends_on=_serialize_json(node.depends_on),
                    retry_count=node.retry_count,
                    timeout_seconds=node.timeout_seconds,
                    config=_serialize_json(node.config),
                )
            )
        db.commit()
    except Exception:
        db.rollback()
        logger.exception(
            "Failed to persist workflow definition",
            extra={
                "workflow_id": workflow.id,
                "operation": "persist_workflow_definition",
                "error_type": "database_failure",
            },
        )
        raise
    finally:
        db.close()


def _load_workflow_definition(workflow_id: str) -> WorkflowStorageOut | None:
    db = SessionLocal()
    try:
        record = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
        if record is None:
            return None
        rows = db.query(models.WorkflowNodeRecord).filter(models.WorkflowNodeRecord.workflow_id == workflow_id).order_by(models.WorkflowNodeRecord.id).all()
        nodes = [
            WorkflowNode(
                id=row.node_id,
                type=row.node_type,
                name=row.name,
                depends_on=json.loads(row.depends_on or "[]"),
                retry_count=row.retry_count,
                timeout_seconds=row.timeout_seconds,
                config=json.loads(getattr(row, "config", "{}") or "{}"),
            )
            for row in rows
        ]
        return WorkflowStorageOut(
            id=record.id,
            name=record.name,
            nodes=nodes,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )
    except Exception:
        logger.exception(
            "Failed to load workflow definition",
            extra={
                "workflow_id": workflow_id,
                "operation": "load_workflow_definition",
                "error_type": "database_failure",
            },
        )
        raise
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Run state persistence
# ---------------------------------------------------------------------------

def _persist_run_state(run: WorkflowRunOut) -> None:
    db = SessionLocal()
    try:
        record = db.query(models.WorkflowRunRecord).filter(models.WorkflowRunRecord.id == run.run_id).first()
        if record is None:
            record = models.WorkflowRunRecord(id=run.run_id, workflow_id=run.workflow_id)
            db.add(record)
        record.workflow_id = run.workflow_id
        record.status = run.state.status
        record.current_node = run.state.current_node
        record.completed_nodes = _serialize_json(run.state.completed_nodes)
        record.error = run.state.error
        record.execution_log = _serialize_json(_EXECUTION_HISTORY.get(run.run_id, []))
        record.metrics_json = _serialize_json(_EXECUTION_METRICS.get(run.run_id, {}))
        record.updated_at = _now()
        db.commit()
    except Exception:
        db.rollback()
        logger.exception(
            "Failed to persist workflow run state",
            extra={
                "run_id": run.run_id,
                "workflow_id": run.workflow_id,
                "operation": "persist_run_state",
                "error_type": "database_failure",
            },
        )
        raise
    finally:
        db.close()


def _load_run_state(run_id: str) -> WorkflowRunOut | None:
    db = SessionLocal()
    try:
        record = db.query(models.WorkflowRunRecord).filter(models.WorkflowRunRecord.id == run_id).first()
        if record is None:
            return None
        metrics = json.loads(record.metrics_json or "{}")
        history = json.loads(record.execution_log or "[]")
        _EXECUTION_METRICS[run_id] = metrics
        _EXECUTION_HISTORY[run_id] = history
        _EXECUTION_STATES[run_id] = {
            "run_id": record.id,
            "workflow_id": record.workflow_id,
            "status": record.status,
            "current_node": record.current_node,
            "completed_nodes": json.loads(record.completed_nodes or "[]"),
            "error": record.error,
            "approval_node": metrics.get("approval_node"),
        }
        return WorkflowRunOut(
            run_id=record.id,
            workflow_id=record.workflow_id,
            state=WorkflowState(
                status=record.status,
                current_node=record.current_node,
                completed_nodes=json.loads(record.completed_nodes or "[]"),
                error=record.error,
                approval_node=metrics.get("approval_node"),
            ),
        )
    except Exception:
        logger.exception(
            "Failed to load workflow run state",
            extra={
                "run_id": run_id,
                "operation": "load_run_state",
                "error_type": "database_failure",
            },
        )
        raise
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Execution history / metrics helpers
# ---------------------------------------------------------------------------

def _record_execution_history(run_id: str, message: str) -> None:
    history = _EXECUTION_HISTORY.setdefault(run_id, [])
    history.append(message)
    run = _WORKFLOW_RUNS.get(run_id)
    if run is not None:
        _persist_run_state(run)


def _sync_execution_metrics(run_id: str, workflow: WorkflowStorageOut | None = None, state: WorkflowState | None = None) -> None:
    metrics = _EXECUTION_METRICS.setdefault(run_id, {})
    metrics["completed"] = len(state.completed_nodes) if state is not None else metrics.get("completed", 0)
    metrics["failed"] = 1 if state is not None and state.status == "failed" else 0
    if workflow is not None:
        metrics["total_nodes"] = len(workflow.nodes)
    _EXECUTION_METRICS[run_id] = metrics


# ---------------------------------------------------------------------------
# Scheduled job helpers
# ---------------------------------------------------------------------------

def _schedule_run(run_id: str, priority: int = 0, delay_seconds: int = 0) -> None:
    queued_at = _now()
    scheduled_at = queued_at + timedelta(seconds=max(delay_seconds, 0))
    queue_item = {
        "run_id": run_id,
        "priority": priority,
        "queued_at": queued_at,
        "scheduled_for": scheduled_at,
    }

    db = SessionLocal()
    try:
        if not db.bind or not inspect(db.bind).has_table("scheduled_workflow_jobs"):
            _EXECUTION_QUEUE[:] = [item for item in _EXECUTION_QUEUE if item["run_id"] != run_id]
            _EXECUTION_QUEUE.append(queue_item)
            _EXECUTION_QUEUE.sort(
                key=lambda item: (-int(item["priority"]), item["scheduled_for"], item["queued_at"])
            )
            return

        existing = db.query(models.ScheduledWorkflowJob).filter(
            models.ScheduledWorkflowJob.run_id == run_id
        ).first()
        if existing is None:
            db.add(models.ScheduledWorkflowJob(
                id=f"job-{uuid4().hex}",
                run_id=run_id,
                workflow_id=_WORKFLOW_RUNS[run_id].workflow_id,
                priority=priority,
                scheduled_for=scheduled_at,
                status="queued",
                claimed_by=None,
                claimed_at=None,
            ))
        else:
            existing.priority = priority
            existing.scheduled_for = scheduled_at
            existing.status = "queued"
            existing.claimed_by = None
            existing.claimed_at = None
            existing.updated_at = queued_at
        db.commit()

        _EXECUTION_QUEUE[:] = [item for item in _EXECUTION_QUEUE if item["run_id"] != run_id]
        _EXECUTION_QUEUE.append(queue_item)
        _EXECUTION_QUEUE.sort(
            key=lambda item: (-int(item["priority"]), item["scheduled_for"], item["queued_at"])
        )
    except Exception:
        db.rollback()
        logger.exception(
            "Failed to schedule workflow run",
            extra={
                "run_id": run_id,
                "priority": priority,
                "delay_seconds": delay_seconds,
                "operation": "schedule_run",
                "error_type": "database_failure",
            },
        )
        raise
    finally:
        db.close()


def _claim_job(run_id: str) -> bool:
    """Atomically claim a due queued job, or reclaim an expired worker lease."""
    from app.routers.workflow_execution import _WORKER_ID
    db = SessionLocal()
    try:
        if not db.bind or not inspect(db.bind).has_table("scheduled_workflow_jobs"):
            return True
        now = _now()
        import os
        lease_seconds = max(int(os.getenv("WORKFLOW_CLAIM_LEASE_SECONDS", "3600")), 60)
        stale_before = now - timedelta(seconds=lease_seconds)
        updated = db.query(models.ScheduledWorkflowJob).filter(
            models.ScheduledWorkflowJob.run_id == run_id,
            models.ScheduledWorkflowJob.scheduled_for <= now,
            (
                (models.ScheduledWorkflowJob.status == "queued")
                | (
                    (models.ScheduledWorkflowJob.status == "running")
                    & (
                        models.ScheduledWorkflowJob.claimed_at.is_(None)
                        | (models.ScheduledWorkflowJob.claimed_at <= stale_before)
                    )
                )
            ),
        ).update(
            {
                "status": "running",
                "claimed_by": _WORKER_ID,
                "claimed_at": now,
                "updated_at": now,
            },
            synchronize_session=False,
        )
        db.commit()
        return updated == 1
    except Exception:
        db.rollback()
        logger.exception(
            "Failed to claim workflow job",
            extra={
                "run_id": run_id,
                "operation": "claim_job",
                "error_type": "database_failure",
            },
        )
        raise
    finally:
        db.close()


def _release_job_claim(run_id: str) -> None:
    """Return a failed worker-owned job to queued state for retry/recovery."""
    from app.routers.workflow_execution import _WORKER_ID
    db = SessionLocal()
    try:
        if not db.bind or not inspect(db.bind).has_table("scheduled_workflow_jobs"):
            return
        now = _now()
        db.query(models.ScheduledWorkflowJob).filter(
            models.ScheduledWorkflowJob.run_id == run_id,
            models.ScheduledWorkflowJob.status == "running",
            models.ScheduledWorkflowJob.claimed_by == _WORKER_ID,
        ).update(
            {
                "status": "queued",
                "claimed_by": None,
                "claimed_at": None,
                "updated_at": now,
            },
            synchronize_session=False,
        )
        db.commit()
    except Exception:
        db.rollback()
        logger.exception(
            "Failed to release workflow job claim",
            extra={
                "run_id": run_id,
                "operation": "release_claim",
                "error_type": "database_failure",
            },
        )
        raise
    finally:
        db.close()


def _mark_job_terminal(run_id: str, status_value: str) -> None:
    db = SessionLocal()
    try:
        if not db.bind or not inspect(db.bind).has_table("scheduled_workflow_jobs"):
            return
        job = db.query(models.ScheduledWorkflowJob).filter(models.ScheduledWorkflowJob.run_id == run_id).first()
        if job is not None:
            job.status = status_value
            job.updated_at = _now()
            db.commit()
    except Exception:
        db.rollback()
        logger.exception(
            "Failed to mark workflow job terminal",
            extra={
                "run_id": run_id,
                "status_value": status_value,
                "operation": "mark_job_terminal",
                "error_type": "database_failure",
            },
        )
        raise
    finally:
        db.close()


def _record_controller_result(run_id: str, status_value: str) -> None:
    controller_id = _CONTROLLER_RUNS.pop(run_id, None)
    if not controller_id:
        return
    db = SessionLocal()
    try:
        controller = db.query(models.Controller).filter(models.Controller.id == controller_id).first()
        if controller is None:
            return
        controller.last_execution = _now()
        if status_value == "completed":
            controller.success_count += 1
        else:
            controller.failure_count += 1
        controller.updated_at = _now()
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        logger.exception(
            "Failed to record controller result",
            extra={
                "run_id": run_id,
                "controller_id": controller_id,
                "status_value": status_value,
                "operation": "record_controller_result",
                "error_type": "database_failure",
            },
        )
        raise
    finally:
        db.close()


def restore_pending_workflow_runs() -> int:
    """Reload persisted queued/running runs into the in-process queue on startup."""
    restored = 0
    db = SessionLocal()
    try:
        jobs = db.query(models.ScheduledWorkflowJob).filter(
            models.ScheduledWorkflowJob.status.in_(["queued", "running"])
        ).order_by(
            models.ScheduledWorkflowJob.priority.desc(),
            models.ScheduledWorkflowJob.scheduled_for.asc(),
        ).all()
        for job in jobs:
            run = _load_run_state(job.run_id)
            if run is None:
                job.status = "failed"
                job.updated_at = _now()
                continue
            if run.state.status == "running":
                run.state.status = "queued"
                run.state.current_node = None
                job.status = "queued"
                job.claimed_by = None
                job.claimed_at = None
                _persist_run_state(run)
            if run.state.status in {"completed", "failed"}:
                job.status = run.state.status
                job.updated_at = _now()
                continue
            _WORKFLOW_RUNS[run.run_id] = run
            wf = _load_workflow_definition(run.workflow_id)
            if wf is not None:
                _WORKFLOW_STORAGE[wf.id] = wf
            _EXECUTION_STATES[run.run_id] = {
                "run_id": run.run_id,
                "workflow_id": run.workflow_id,
                "status": run.state.status,
                "current_node": run.state.current_node,
                "completed_nodes": run.state.completed_nodes,
                "error": run.state.error,
                "approval_node": run.state.approval_node,
            }
            if not any(item["run_id"] == run.run_id for item in _EXECUTION_QUEUE):
                _EXECUTION_QUEUE.append({
                    "run_id": run.run_id,
                    "priority": job.priority,
                    "queued_at": _as_utc(job.created_at),
                    "scheduled_for": _as_utc(job.scheduled_for),
                })
                restored += 1
        db.commit()
    except Exception:
        db.rollback()
        logger.exception(
            "Failed to restore pending workflow runs",
            extra={
                "operation": "restore_pending_workflow_runs",
                "error_type": "database_failure",
            },
        )
        raise
    finally:
        db.close()
    _EXECUTION_QUEUE.sort(key=lambda item: (-int(item["priority"]), item["scheduled_for"], item["queued_at"]))
    return restored
