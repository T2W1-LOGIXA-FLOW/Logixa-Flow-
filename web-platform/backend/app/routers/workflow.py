from __future__ import annotations

import asyncio
import json
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
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
from app.security import decode_token, require_admin

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
_CONTROLLER_RUNS: dict[str, str] = {}


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
        return
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
        return None
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
        return
    finally:
        db.close()


def _load_run_state(run_id: str) -> WorkflowRunOut | None:
    db = SessionLocal()
    try:
        record = db.query(models.WorkflowRunRecord).filter(models.WorkflowRunRecord.id == run_id).first()
        if record is None:
            return None
        return WorkflowRunOut(
            run_id=record.id,
            workflow_id=record.workflow_id,
            state=WorkflowState(
                status=record.status,
                current_node=record.current_node,
                completed_nodes=json.loads(record.completed_nodes or "[]"),
                error=record.error,
            ),
        )
    except Exception:
        return None
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
        }

    def persist(self) -> None:
        _EXECUTION_STATES[self.run_id] = self.snapshot()
        _sync_execution_metrics(self.run_id, self.workflow, self.state)
        run = _WORKFLOW_RUNS.get(self.run_id)
        if run is not None:
            run.state = self.state
            _persist_run_state(run)

    def mark_running(self) -> None:
        self.state.status = "running"
        self.state.error = None
        self.persist()

    def cancel(self, message: str = "workflow execution cancelled") -> None:
        self.mark_cancelled(message)

    def mark_cancelled(self, message: str = "workflow execution cancelled") -> None:
        self.cancel_requested = True
        self.state.status = "failed"
        self.state.current_node = None
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
    _EXECUTION_QUEUE[:] = [item for item in _EXECUTION_QUEUE if item["run_id"] != run_id]
    _EXECUTION_QUEUE.append({"run_id": run_id, "priority": priority, "queued_at": queued_at, "scheduled_for": scheduled_at})
    _EXECUTION_QUEUE.sort(key=lambda item: (-int(item["priority"]), item["scheduled_for"], item["queued_at"]))
    db = SessionLocal()
    try:
        if not db.bind or not inspect(db.bind).has_table("scheduled_workflow_jobs"):
            return
        existing = db.query(models.ScheduledWorkflowJob).filter(models.ScheduledWorkflowJob.run_id == run_id).first()
        if existing is None:
            db.add(models.ScheduledWorkflowJob(
                id=f"job-{uuid4().hex}",
                run_id=run_id,
                workflow_id=_WORKFLOW_RUNS[run_id].workflow_id,
                priority=priority,
                scheduled_for=scheduled_at,
                status="queued",
            ))
        else:
            existing.priority = priority
            existing.scheduled_for = scheduled_at
            existing.status = "queued"
            existing.updated_at = queued_at
        db.commit()
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
    if not bool(node.config.get("approved", False)):
        raise RuntimeError(f"approval '{node.name}' is awaiting approval")
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
            if run.state.status in {"failed", "completed"}:
                _EXECUTION_QUEUE.pop(0)
                continue
            if _as_utc(item["scheduled_for"]) > now:
                await asyncio.sleep(max((_as_utc(item["scheduled_for"]) - now).total_seconds(), 0))
                continue
            _EXECUTION_QUEUE.pop(0)
            if run.state.status == "queued":
                db = SessionLocal()
                try:
                    job = db.query(models.ScheduledWorkflowJob).filter(models.ScheduledWorkflowJob.run_id == run.run_id).first()
                    if job is not None:
                        job.status = "running"
                        job.updated_at = _now()
                        db.commit()
                finally:
                    db.close()
                task = asyncio.create_task(_execute_workflow(run.run_id))
                _track_task(task)
    finally:
        _QUEUE_WORKER_RUNNING = False


def _track_task(task: asyncio.Task[None]) -> None:
    _RUN_TASKS.add(task)
    task.add_done_callback(_RUN_TASKS.discard)


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
    start_queue_worker()
    return run


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
        return {"run_id": run.run_id, "workflow_id": run.workflow_id, "status": run.state.status, "current_node": run.state.current_node, "completed_nodes": run.state.completed_nodes, "error": run.state.error}
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


@router.websocket("/ws")
async def workflow_telemetry(websocket: WebSocket) -> None:
    # Browser WebSocket clients cannot set arbitrary Authorization headers.
    # Authenticate with a short-lived JWT in the first WebSocket message instead
    # of placing the token in the URL query string.
    await websocket.accept()
    try:
        raw_message = await websocket.receive_text()
        message = json.loads(raw_message)
        token = message.get("token") if isinstance(message, dict) else None
        if not isinstance(message, dict) or message.get("type") != "auth" or not isinstance(token, str) or not token:
            await websocket.close(code=4401)
            return

        payload = decode_token(token)
        if payload.get("role") != "admin":
            await websocket.close(code=4403)
            return
        await websocket.send_json({"type": "auth.ok"})
    except (WebSocketDisconnect, json.JSONDecodeError, TypeError, HTTPException):
        await websocket.close(code=4401)
        return

    _SUBSCRIBERS.add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        _SUBSCRIBERS.discard(websocket)
