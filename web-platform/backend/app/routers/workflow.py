from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect, status
from starlette.concurrency import run_in_threadpool
from sqlalchemy import inspect
from sqlalchemy.exc import SQLAlchemyError

from app import models
from app.database import SessionLocal
from app.schemas import (
    WorkflowNode,
    WorkflowRunOut,
    WorkflowRunRequest,
    WorkflowState,
    WorkflowStorageCreate,
    WorkflowStorageOut,
    WorkflowTelemetryEvent,
)
from app.security import _verify_supabase_token, require_admin
from app.qstash import publish_workflow_run, qstash_configured

router = APIRouter(prefix="/api/admin/workflow", tags=["admin", "workflow"])

_WORKFLOW_STORAGE: dict[str, WorkflowStorageOut] = {}
_WORKFLOW_RUNS: dict[str, WorkflowRunOut] = {}
_SUBSCRIBERS: set[WebSocket] = set()
_RUN_TASKS: set[asyncio.Task[None]] = set()
_EXECUTION_QUEUE: list[dict[str, Any]] = []
_ERROR_NOTIFICATIONS: list[dict[str, str]] = []
_EXECUTION_STATES: dict[str, dict[str, Any]] = {}
_EXECUTION_HISTORY: dict[str, list[str]] = {}
_EXECUTION_METRICS: dict[str, dict[str, Any]] = {}
_QUEUE_WORKER_RUNNING = False
_WORKER_ID = os.getenv("WORKFLOW_WORKER_ID", "").strip() or f"worker-{uuid4().hex[:12]}"
_CONTROLLER_RUNS: dict[str, str] = {}
_WEBSOCKET_AUTH_TIMEOUT_SECONDS = 10
_WEBSOCKET_AUTH_RECHECK_SECONDS = 60

logger = logging.getLogger(__name__)


def _serialize_json(value: Any) -> str:
    return json.dumps(value, separators=(",", ":"))


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


class ApprovalRequired(RuntimeError):
    """Raised when a workflow must pause for explicit human approval."""


class WorkflowExecutor:
    def __init__(self, run_id: str, workflow_id: str, workflow: WorkflowStorageOut) -> None:
        self.run_id = run_id
        self.workflow_id = workflow_id
        self.workflow = workflow
        self.state = WorkflowState(status="queued")
        self.completed_nodes: set[str] = set()
        self.active_nodes: set[str] = set()
        self.cancel_requested = False
        self._node_tasks: dict[str, asyncio.Task[None]] = {}

    def snapshot(self) -> dict[str, Any]:
        return {
            "run_id": self.run_id,
            "workflow_id": self.workflow_id,
            "status": self.state.status,
            "current_node": self.state.current_node,
            "completed_nodes": list(self.state.completed_nodes),
            "error": self.state.error,
            "approval_node": self.state.approval_node,
        }

    def persist(self) -> None:
        _EXECUTION_STATES[self.run_id] = self.snapshot()
        _sync_execution_metrics(self.run_id, self.workflow, self.state)
        if self.state.approval_node:
            _EXECUTION_METRICS[self.run_id]["approval_node"] = self.state.approval_node
        else:
            _EXECUTION_METRICS[self.run_id].pop("approval_node", None)
        run = _WORKFLOW_RUNS.get(self.run_id)
        if run is not None:
            run.state = self.state
            _persist_run_state(run)

    def mark_running(self) -> None:
        self.state.status = "running"
        self.state.error = None
        self.state.approval_node = None
        self.persist()

    def cancel(self, message: str = "workflow execution cancelled") -> None:
        self.mark_cancelled(message)

    def mark_cancelled(self, message: str = "workflow execution cancelled") -> None:
        self.cancel_requested = True
        self.state.status = "failed"
        self.state.current_node = None
        self.state.approval_node = None
        self.state.error = message
        for task in list(self._node_tasks.values()):
            if not task.done():
                task.cancel()
        self.persist()

    async def _execute_node(self, node: Any) -> None:
        self.active_nodes.add(node.id)
        self.state.current_node = node.id
        self.persist()
        await _broadcast(WorkflowTelemetryEvent(event="workflow.status", run_id=self.run_id, workflow_id=self.workflow_id, state=self.state))

        attempts = 0
        last_error: Exception | None = None
        while attempts <= node.retry_count:
            if self.cancel_requested:
                raise asyncio.CancelledError
            try:
                await asyncio.wait_for(_execute_node_action(node, self.run_id), timeout=node.timeout_seconds)
                self.completed_nodes.add(node.id)
                self.state.completed_nodes = list(self._execution_order())
                self.state.error = None
                self.persist()
                return
            except asyncio.CancelledError:
                raise
            except ApprovalRequired:
                self.state.status = "waiting_approval"
                self.state.approval_node = node.id
                self.state.error = None
                self.persist()
                await _broadcast(WorkflowTelemetryEvent(event="workflow.status", run_id=self.run_id, workflow_id=self.workflow_id, state=self.state))
                return
            except asyncio.TimeoutError as exc:
                last_error = exc
                attempts += 1
                if attempts > node.retry_count:
                    raise RuntimeError(f"node '{node.id}' timed out after {node.timeout_seconds}s") from exc
            except Exception as exc:
                last_error = exc
                attempts += 1
                if attempts > node.retry_count:
                    raise RuntimeError(f"node '{node.id}' failed: {exc}") from exc

        if last_error is not None:
            raise RuntimeError(f"node '{node.id}' could not complete after retries")

    def _execution_order(self) -> list[str]:
        ordered: list[str] = []
        for node_id in _node_order(self.workflow):
            if node_id in self.completed_nodes:
                ordered.append(node_id)
        return ordered

    async def execute(self) -> WorkflowState:
        if self.cancel_requested:
            self.state.status = "failed"
            self.state.error = "workflow execution cancelled"
            self.persist()
            return self.state

        self.mark_running()
        try:
            ordered = _node_order(self.workflow)
            while len(self.completed_nodes) < len(ordered):
                if self.cancel_requested:
                    raise asyncio.CancelledError
                ready = [
                    node for node in self.workflow.nodes
                    if node.id not in self.completed_nodes and node.id not in self.active_nodes and all(dep in self.completed_nodes for dep in node.depends_on)
                ]
                if not ready:
                    remaining = [node_id for node_id in ordered if node_id not in self.completed_nodes]
                    if remaining:
                        raise RuntimeError(f"workflow is blocked by unmet dependencies: {remaining}")
                    break

                tasks = [
                    asyncio.create_task(self._execute_node(node))
                    for node in ready
                ]
                for task in tasks:
                    self._node_tasks[task.get_name() if hasattr(task, "get_name") else str(id(task))] = task
                try:
                    await asyncio.gather(*tasks)
                except asyncio.CancelledError:
                    raise
                except Exception as exc:
                    for task in tasks:
                        if not task.done():
                            task.cancel()
                    raise RuntimeError(str(exc)) from exc
                finally:
                    for task in tasks:
                        task_name = task.get_name() if hasattr(task, "get_name") else str(id(task))
                        self._node_tasks.pop(task_name, None)
                    self.active_nodes.clear()

                if self.state.status == "waiting_approval":
                    return self.state

            if self.cancel_requested:
                self.state.status = "failed"
                self.state.error = "workflow execution cancelled"
                raise asyncio.CancelledError

            if len(self.completed_nodes) == len(ordered):
                self.state.status = "completed"
                self.state.current_node = None
                self.state.error = None
                self.persist()
                await _broadcast(WorkflowTelemetryEvent(event="workflow.status", run_id=self.run_id, workflow_id=self.workflow_id, state=self.state))
                return self.state

            self.state.status = "failed"
            self.state.error = "workflow execution stalled"
            self.persist()
            return self.state
        except asyncio.CancelledError:
            self.mark_cancelled("workflow execution cancelled")
            raise
        except Exception as exc:
            self.state.current_node = None
            self.state.status = "failed"
            self.state.error = str(exc)
            self.persist()
            await _notify_error(self.run_id, self.workflow_id, str(exc))
            return self.state


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


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


async def _broadcast(event: WorkflowTelemetryEvent) -> None:
    stale: list[WebSocket] = []
    for websocket in tuple(_SUBSCRIBERS):
        try:
            await websocket.send_json(event.model_dump(mode="json"))
        except Exception:
            stale.append(websocket)
    for websocket in stale:
        _SUBSCRIBERS.discard(websocket)


def _node_order(workflow: WorkflowStorageOut) -> list[str]:
    index = {node.id: node for node in workflow.nodes}
    ordered: list[str] = []
    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(node_id: str) -> None:
        if node_id in visited:
            return
        if node_id in visiting:
            raise ValueError(f"workflow dependency cycle detected at node '{node_id}'")
        visiting.add(node_id)
        node = index[node_id]
        for dependency in node.depends_on:
            if dependency not in index:
                raise ValueError(f"node '{node_id}' depends on missing node '{dependency}'")
            visit(dependency)
        visiting.remove(node_id)
        visited.add(node_id)
        ordered.append(node_id)

    for node in workflow.nodes:
        visit(node.id)
    return ordered


async def _execute_task_action(node: Any, run_id: str) -> None:
    action = str(node.config.get("action", "log")).strip().lower()
    if action == "log":
        _record_execution_history(run_id, f"task:{node.id}: {str(node.config.get('message', node.name)).strip()}")
        return
    if action == "set_metadata":
        key = str(node.config.get("key", "")).strip()
        if not key:
            raise ValueError("task set_metadata requires config.key")
        _EXECUTION_METRICS.setdefault(run_id, {}).setdefault("metadata", {})[key] = node.config.get("value")
        _record_execution_history(run_id, f"task:{node.id}: metadata '{key}' updated")
        return
    raise ValueError(f"unsupported task action '{action}'")

async def _execute_approval_action(node: Any, run_id: str) -> None:
    approved_nodes = set(_EXECUTION_METRICS.setdefault(run_id, {}).get("approved_nodes", []))
    if node.id not in approved_nodes:
        raise ApprovalRequired(f"approval '{node.name}' is awaiting approval")
    _record_execution_history(run_id, f"approval:{node.id}: approved")

async def _execute_notification_action(node: Any, run_id: str) -> None:
    channel = str(node.config.get("channel", "log")).strip().lower()
    if channel != "log":
        raise ValueError(f"unsupported notification channel '{channel}'")
    _record_execution_history(run_id, f"notification:{node.id}: {str(node.config.get('message', node.name)).strip()}")

_NODE_ACTIONS = {
    "task": _execute_task_action,
    "approval": _execute_approval_action,
    "notification": _execute_notification_action,
}

async def _execute_node_action(node: Any, run_id: str) -> None:
    action = _NODE_ACTIONS.get(node.type)
    if action is None:
        raise ValueError(f"unsupported workflow node type '{node.type}'")
    await action(node, run_id)


async def _notify_error(run_id: str, workflow_id: str, message: str) -> None:
    _ERROR_NOTIFICATIONS.append({"run_id": run_id, "workflow_id": workflow_id, "message": message})
    _record_execution_history(run_id, message)
    run = _WORKFLOW_RUNS.get(run_id)
    if run is not None:
        _sync_execution_metrics(run_id, _WORKFLOW_STORAGE.get(run.workflow_id), run.state)
        _persist_run_state(run)
    notification = WorkflowTelemetryEvent(
        event="workflow.status",
        run_id=run_id,
        workflow_id=workflow_id,
        state=WorkflowState(status="failed", current_node=None, completed_nodes=[], error=message),
    )
    await _broadcast(notification)


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


def _claim_job(run_id: str) -> bool:
    """Atomically claim a due queued job, or reclaim an expired worker lease."""
    db = SessionLocal()
    try:
        if not db.bind or not inspect(db.bind).has_table("scheduled_workflow_jobs"):
            return True
        now = _now()
        lease_seconds = max(int(os.getenv("WORKFLOW_CLAIM_LEASE_SECONDS", "3600")), 60)
        stale_before = now - timedelta(seconds=lease_seconds)
        updated = db.query(models.ScheduledWorkflowJob).filter(
            models.ScheduledWorkflowJob.run_id == run_id,
            models.ScheduledWorkflowJob.scheduled_for <= now,
            (
                (models.ScheduledWorkflowJob.status == "queued")
                | (
                    (models.ScheduledWorkflowJob.status == "running")
                    & (models.ScheduledWorkflowJob.claimed_at <= stale_before)
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


async def _execute_workflow(run_id: str) -> None:
    run = _WORKFLOW_RUNS.get(run_id)
    if run is None:
        return
    workflow = _WORKFLOW_STORAGE.get(run.workflow_id)
    if workflow is None:
        run.state.status = "failed"
        run.state.error = "workflow no longer exists"
        _EXECUTION_STATES[run_id] = {"run_id": run_id, "workflow_id": run.workflow_id, "status": "failed", "current_node": None, "completed_nodes": [], "error": run.state.error}
        _mark_job_terminal(run_id, "failed")
        _record_controller_result(run_id, "failed")
        await _broadcast(WorkflowTelemetryEvent(event="workflow.status", **run.model_dump()))
        return

    executor = WorkflowExecutor(run_id, run.workflow_id, workflow)
    executor.state = run.state
    executor.state.status = "queued"
    executor.persist()
    try:
        final_state = await executor.execute()
        run.state = final_state
        _EXECUTION_STATES[run_id] = executor.snapshot()
        _mark_job_terminal(run.run_id, final_state.status)
        if final_state.status != "waiting_approval":
            _record_controller_result(run.run_id, final_state.status)
        await _broadcast(WorkflowTelemetryEvent(event="workflow.status", run_id=run.run_id, workflow_id=run.workflow_id, state=final_state))
    except asyncio.CancelledError:
        run.state = executor.state
        _EXECUTION_STATES[run_id] = executor.snapshot()
        _mark_job_terminal(run.run_id, executor.state.status)
        _record_controller_result(run.run_id, executor.state.status)
        await _broadcast(WorkflowTelemetryEvent(event="workflow.status", run_id=run.run_id, workflow_id=run.workflow_id, state=executor.state))


def restore_pending_workflow_runs() -> int:
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


def start_queue_worker() -> None:
    global _QUEUE_WORKER_RUNNING
    if _QUEUE_WORKER_RUNNING or not _EXECUTION_QUEUE:
        return
    _QUEUE_WORKER_RUNNING = True
    asyncio.create_task(_queue_worker())


async def _queue_worker() -> None:
    global _QUEUE_WORKER_RUNNING
    try:
        while _EXECUTION_QUEUE:
            item = _EXECUTION_QUEUE[0]
            run = _WORKFLOW_RUNS.get(item["run_id"])
            now = _now()
            if run is None:
                _EXECUTION_QUEUE.pop(0)
                continue
            if run.state.status in {"failed", "completed", "waiting_approval"}:
                _EXECUTION_QUEUE.pop(0)
                continue
            if _as_utc(item["scheduled_for"]) > now:
                await asyncio.sleep(max((_as_utc(item["scheduled_for"]) - now).total_seconds(), 0))
                continue

            if run.state.status == "queued":
                try:
                    claimed = _claim_job(run.run_id)
                except Exception:
                    logger.exception(
                        "Workflow queue worker failed to claim job",
                        extra={
                            "run_id": run.run_id,
                            "operation": "queue_worker_claim",
                            "error_type": "database_failure",
                        },
                    )
                    return

                _EXECUTION_QUEUE.pop(0)
                if not claimed:
                    continue
                task = asyncio.create_task(_execute_workflow(run.run_id))
                _track_task(task)
            else:
                _EXECUTION_QUEUE.pop(0)
    finally:
        _QUEUE_WORKER_RUNNING = False


def _track_task(task: asyncio.Task[None]) -> None:
    _RUN_TASKS.add(task)
    task.add_done_callback(_RUN_TASKS.discard)


def _dispatch_workflow_run(run_id: str, delay_seconds: int = 0) -> None:
    """Dispatch a persisted workflow run through QStash or the in-process fallback.

    QStash is deliberately usable without Celery so the production Free Web Service
    can keep durable delivery/scheduling while avoiding a paid Render worker.
    """
    if qstash_configured():
        scheduled_for = (_now() + timedelta(seconds=max(delay_seconds, 0))).timestamp()
        try:
            publish_workflow_run(run_id, scheduled_for)
            return
        except Exception:
            logger.exception(
                "Failed to publish workflow run to QStash",
                extra={"run_id": run_id, "operation": "qstash_publish"},
            )
            _mark_job_terminal(run_id, "failed")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Workflow queue is temporarily unavailable",
            )

    if os.getenv("CELERY_ENABLED", "false").lower() == "true":
        from app.workers.tasks import execute_workflow_task
        execute_workflow_task.apply_async(
            args=[run_id],
            countdown=max(delay_seconds, 0),
        )
        return

    start_queue_worker()


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
        receiver.verify(
            body=body.decode("utf-8"),
            signature=signature,
            url=str(request.url),
            upstash_region=request.headers.get("upstash-region"),
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

    if os.getenv("CELERY_ENABLED", "false").lower() == "true":
        from app.workers.tasks import execute_workflow_task
        execute_workflow_task.delay(run_id)
        return {"status": "queued", "run_id": run_id}

    # Free Render mode: keep execution inside the QStash request so QStash owns
    # retry/delivery and can wake the sleeping Web Service for scheduled runs.
    await _execute_workflow(run_id)
    run = _WORKFLOW_RUNS.get(run_id)
    return {"status": run.state.status if run is not None else "completed", "run_id": run_id}


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


@router.post("/{workflow_id}/runs", response_model=WorkflowRunOut, status_code=status.HTTP_202_ACCEPTED)
async def run_workflow(workflow_id: str, payload: WorkflowRunRequest, _admin=Depends(require_admin)) -> WorkflowRunOut:
    if payload.workflow_id != workflow_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="workflow_id does not match path")
    return await enqueue_workflow_run(workflow_id, priority=payload.priority, delay_seconds=payload.delay_seconds)


@router.get("/runs/{run_id}/state")
async def workflow_run_state(run_id: str, _admin=Depends(require_admin)) -> dict[str, Any]:
    run = _WORKFLOW_RUNS.get(run_id)
    if run is not None:
        return {"run_id": run.run_id, "workflow_id": run.workflow_id, "status": run.state.status, "current_node": run.state.current_node, "completed_nodes": run.state.completed_nodes, "error": run.state.error, "approval_node": run.state.approval_node}
    state = _EXECUTION_STATES.get(run_id)
    if state is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="run not found")
    return state


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


@router.websocket("/ws")
async def workflow_telemetry(websocket: WebSocket) -> None:
    # Browser WebSocket clients send the Supabase access token in the first message.
    await websocket.accept()
    try:
        raw_message = await asyncio.wait_for(
            websocket.receive_text(),
            timeout=_WEBSOCKET_AUTH_TIMEOUT_SECONDS,
        )
        message = json.loads(raw_message)
        token = message.get("token") if isinstance(message, dict) else None
        if not isinstance(message, dict) or message.get("type") != "auth" or not isinstance(token, str) or not token:
            await websocket.close(code=4401)
            return

        await run_in_threadpool(_verify_supabase_token, token)
        await websocket.send_json({"type": "auth.ok"})
    except (asyncio.TimeoutError, WebSocketDisconnect, json.JSONDecodeError, TypeError):
        await websocket.close(code=4401)
        return
    except HTTPException as exc:
        await websocket.close(code=_websocket_auth_close_code(exc))
        return

    _SUBSCRIBERS.add(websocket)
    loop = asyncio.get_running_loop()
    recheck_at = loop.time() + _WEBSOCKET_AUTH_RECHECK_SECONDS
    while True:
        try:
            await asyncio.wait_for(
                websocket.receive_text(),
                timeout=max(0, recheck_at - loop.time()),
            )
        except asyncio.TimeoutError:
            try:
                await run_in_threadpool(_verify_supabase_token, token)
            except HTTPException as exc:
                await websocket.close(code=_websocket_auth_close_code(exc))
                break
            recheck_at = loop.time() + _WEBSOCKET_AUTH_RECHECK_SECONDS
        except WebSocketDisconnect:
            break
    _SUBSCRIBERS.discard(websocket)


def _websocket_auth_close_code(exc: HTTPException) -> int:
    if exc.status_code == status.HTTP_403_FORBIDDEN:
        return 4403
    if exc.status_code == status.HTTP_503_SERVICE_UNAVAILABLE:
        return 1013
    return 4401
