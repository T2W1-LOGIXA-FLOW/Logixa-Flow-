"""Workflow execution engine.

Contains the WorkflowExecutor class, node action handlers, the in-process
queue worker, and all async execution helpers. Imports shared state from
``workflow_persistence``.
"""
from __future__ import annotations

import asyncio
import html
import logging
import os
from typing import Any
from uuid import uuid4

from fastapi import WebSocket

from app.config import telegram_configured, telegram_enabled
from app.services.telegram import send_telegram_message

from app.schemas import WorkflowRunOut, WorkflowState, WorkflowStorageOut, WorkflowTelemetryEvent
from app.routers.workflow_persistence import (
    _EXECUTION_HISTORY,
    _EXECUTION_METRICS,
    _EXECUTION_QUEUE,
    _EXECUTION_STATES,
    _ERROR_NOTIFICATIONS,
    _WORKFLOW_RUNS,
    _WORKFLOW_STORAGE,
    _now,
    _persist_run_state,
    _record_execution_history,
    _sync_execution_metrics,
    _claim_job,
    _mark_job_terminal,
    _record_controller_result,
    _release_job_claim,
)

logger = logging.getLogger(__name__)

_QUEUE_WORKER_RUNNING = False
_WORKER_ID = os.getenv("WORKFLOW_WORKER_ID", "").strip() or f"worker-{uuid4().hex[:12]}"

# Shared WebSocket subscriber set (also used by workflow_websocket.py)
_SUBSCRIBERS: set[WebSocket] = set()

_RUN_TASKS: set[asyncio.Task[None]] = set()


# ---------------------------------------------------------------------------
# Exception types
# ---------------------------------------------------------------------------

class ApprovalRequired(RuntimeError):
    """Raised when a workflow must pause for explicit human approval."""


# ---------------------------------------------------------------------------
# Topology helpers
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Node action handlers
# ---------------------------------------------------------------------------

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
    message = str(node.config.get("message", node.name)).strip()
    if channel == "log":
        _record_execution_history(run_id, f"notification:{node.id}: {message}")
        return
    if channel == "telegram":
        if not telegram_configured() or not telegram_enabled():
            raise RuntimeError("Telegram notification is not configured and enabled")
        raw_topic_id = node.config.get("topic_id")
        try:
            topic_id = int(raw_topic_id) if raw_topic_id is not None else None
        except (TypeError, ValueError) as exc:
            raise ValueError("Telegram notification topic_id must be an integer") from exc
        if topic_id is not None and topic_id < 1:
            raise ValueError("Telegram notification topic_id must be positive")
        # The Telegram service uses HTML parse mode by default; escape workflow
        # text so arbitrary node labels/messages cannot break formatting.
        result = await send_telegram_message(html.escape(message), topic_id=topic_id)
        if not isinstance(result, dict) or result.get("ok") is not True:
            raise RuntimeError("Telegram API did not confirm notification delivery")
        message_id = result.get("result", {}).get("message_id") if isinstance(result.get("result"), dict) else None
        _record_execution_history(run_id, f"notification:{node.id}: telegram delivered (message_id={message_id})")
        return
    raise ValueError(f"unsupported notification channel '{channel}'")


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


# ---------------------------------------------------------------------------
# Broadcast / error notification
# ---------------------------------------------------------------------------

async def _broadcast(event: WorkflowTelemetryEvent) -> None:
    stale: list[WebSocket] = []
    for websocket in tuple(_SUBSCRIBERS):
        try:
            await websocket.send_json(event.model_dump(mode="json"))
        except Exception:
            stale.append(websocket)
    for websocket in stale:
        _SUBSCRIBERS.discard(websocket)


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


# ---------------------------------------------------------------------------
# WorkflowExecutor
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Queue worker
# ---------------------------------------------------------------------------

def _track_task(task: asyncio.Task[None]) -> None:
    _RUN_TASKS.add(task)
    task.add_done_callback(_RUN_TASKS.discard)


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
    # Resume from durable node progress after process restart. Without this,
    # every completed node would run again and could duplicate side effects.
    executor.completed_nodes = set(run.state.completed_nodes)
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
        if executor.state.status in {"completed", "failed", "waiting_approval"}:
            # Cancellation can arrive after the run reached a durable terminal
            # or approval-paused state. Reconcile that state and let the caller
            # propagate cancellation; a QStash redelivery will then be idempotent.
            _mark_job_terminal(run.run_id, executor.state.status)
            if executor.state.status != "waiting_approval":
                _record_controller_result(run.run_id, executor.state.status)
        else:
            # A cancelled delivery is not a completed workflow. Persist the last
            # completed-node checkpoint, release the lease, and let the durable
            # delivery mechanism retry instead of acknowledging a stuck `running`
            # job as HTTP 200.
            run.state.status = "queued"
            run.state.current_node = None
            run.state.error = None
            _persist_run_state(run)
            _release_job_claim(run.run_id)
        _EXECUTION_STATES[run_id] = executor.snapshot()
        await _broadcast(WorkflowTelemetryEvent(event="workflow.status", run_id=run.run_id, workflow_id=run.workflow_id, state=run.state))
        raise


async def _queue_worker_sleep(delay: float) -> None:
    await asyncio.sleep(delay)


async def _claim_job_with_retry(run_id: str) -> bool:
    """Retry transient claim failures without dropping the queued workflow run."""
    retry_delay = 1.0
    while True:
        try:
            return _claim_job(run_id)
        except Exception:
            logger.exception(
                "Workflow queue worker failed to claim job; retrying with backoff",
                extra={
                    "run_id": run_id,
                    "operation": "queue_worker_claim",
                    "error_type": "database_failure",
                    "retry_delay_seconds": retry_delay,
                },
            )
            await _queue_worker_sleep(retry_delay)
            retry_delay = min(retry_delay * 2, 30.0)


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
            from app.routers.workflow_persistence import _as_utc
            if _as_utc(item["scheduled_for"]) > now:
                await _queue_worker_sleep(max((_as_utc(item["scheduled_for"]) - now).total_seconds(), 0))
                continue

            if run.state.status == "queued":
                # Keep the run at the queue head while a transient claim failure
                # is retried; only dequeue after the claim result is known.
                claimed = await _claim_job_with_retry(run.run_id)
                _EXECUTION_QUEUE.pop(0)
                if not claimed:
                    continue
                task = asyncio.create_task(_execute_workflow(run.run_id))
                _track_task(task)
            else:
                _EXECUTION_QUEUE.pop(0)
    finally:
        _QUEUE_WORKER_RUNNING = False


def start_queue_worker() -> None:
    global _QUEUE_WORKER_RUNNING
    if _QUEUE_WORKER_RUNNING or not _EXECUTION_QUEUE:
        return
    _QUEUE_WORKER_RUNNING = True
    asyncio.create_task(_queue_worker())


def _dispatch_workflow_run(run_id: str, delay_seconds: int = 0) -> None:
    """Dispatch a persisted workflow run through QStash or the in-process fallback.

    QStash is deliberately usable without Celery so the production Free Web Service
    can keep durable delivery/scheduling while avoiding a paid Render worker.
    """
    import os
    from app.qstash import publish_workflow_run, qstash_configured
    from fastapi import HTTPException, status

    if qstash_configured():
        from datetime import timedelta
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
