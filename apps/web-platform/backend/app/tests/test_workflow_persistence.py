from __future__ import annotations

import asyncio
import json
import logging
import sys
from types import ModuleType

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

from app import models
from app.routers import admin, workflow
from app.schemas import WorkflowNode, WorkflowRunRequest, WorkflowStorageCreate, WorkflowStorageOut, WorkflowRunOut, WorkflowState


@pytest.fixture(autouse=True)
def reset_persistence_state(monkeypatch: pytest.MonkeyPatch) -> None:
    workflow._WORKFLOW_STORAGE.clear()
    workflow._WORKFLOW_RUNS.clear()
    workflow._SUBSCRIBERS.clear()
    workflow._RUN_TASKS.clear()
    workflow._EXECUTION_QUEUE.clear()
    workflow._ERROR_NOTIFICATIONS.clear()
    workflow._EXECUTION_STATES.clear()
    workflow._EXECUTION_HISTORY.clear()
    workflow._EXECUTION_METRICS.clear()
    workflow._CONTROLLER_RUNS.clear()
    workflow._QUEUE_WORKER_RUNNING = False

    engine = create_engine("sqlite:///:memory:")
    session_factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    models.Base.metadata.create_all(bind=engine)
    monkeypatch.setattr(workflow, "SessionLocal", session_factory)
    yield
    workflow._WORKFLOW_STORAGE.clear()
    workflow._WORKFLOW_RUNS.clear()
    workflow._SUBSCRIBERS.clear()
    workflow._RUN_TASKS.clear()
    workflow._EXECUTION_QUEUE.clear()
    workflow._ERROR_NOTIFICATIONS.clear()
    workflow._EXECUTION_STATES.clear()
    workflow._EXECUTION_HISTORY.clear()
    workflow._EXECUTION_METRICS.clear()
    workflow._CONTROLLER_RUNS.clear()
    workflow._QUEUE_WORKER_RUNNING = False


@pytest.mark.anyio
async def test_database_schema_exists() -> None:
    db = workflow.SessionLocal()
    try:
        inspector = inspect(db.bind)
        tables = set(inspector.get_table_names())
        assert "workflows" in tables
        assert "workflow_nodes" in tables
        assert "workflow_runs" in tables
        assert "scheduled_workflow_jobs" in tables
    finally:
        db.close()


@pytest.mark.anyio
async def test_workflow_state_persists_to_database() -> None:
    workflow_payload = WorkflowStorageCreate(
        id="persisted-flow",
        name="Persisted Flow",
        nodes=[WorkflowNode(id="alpha", name="Alpha"), WorkflowNode(id="beta", name="Beta", depends_on=["alpha"])],
    )
    await workflow.store_workflow(workflow_payload, _admin={"role": "admin"})

    persisted = workflow._load_workflow_definition("persisted-flow")
    assert persisted is not None
    assert persisted.name == "Persisted Flow"
    assert [node.id for node in persisted.nodes] == ["alpha", "beta"]

    run = await workflow.run_workflow(
        "persisted-flow",
        WorkflowRunRequest(workflow_id="persisted-flow"),
        _admin={"role": "admin"},
    )
    await asyncio.sleep(0.1)

    loaded = workflow._load_run_state(run.run_id)
    assert loaded is not None
    assert loaded.workflow_id == "persisted-flow"
    assert loaded.state.status in {"queued", "running", "completed", "failed"}


@pytest.mark.anyio
async def test_execution_history_tracks_run_logs() -> None:
    workflow_payload = WorkflowStorageCreate(
        id="history-flow",
        name="History Flow",
        nodes=[WorkflowNode(id="task", name="Task")],
    )
    await workflow.store_workflow(workflow_payload, _admin={"role": "admin"})
    run = await workflow.run_workflow(
        "history-flow",
        WorkflowRunRequest(workflow_id="history-flow"),
        _admin={"role": "admin"},
    )
    workflow._record_execution_history(run.run_id, "task executed")
    db = workflow.SessionLocal()
    try:
        record = db.query(models.WorkflowRunRecord).filter(models.WorkflowRunRecord.id == run.run_id).first()
        assert record is not None
        logs = json.loads(record.execution_log or "[]")
        assert "task executed" in logs
    finally:
        db.close()


@pytest.mark.anyio
async def test_pending_workflow_jobs_restore_after_restart() -> None:
    await workflow.store_workflow(
        WorkflowStorageCreate(
            id="restart-flow",
            name="Restart Flow",
            nodes=[WorkflowNode(id="step", name="Step", config={"action": "log", "message": "recovered"})],
        ),
        _admin={"role": "admin"},
    )
    run = await workflow.run_workflow(
        "restart-flow",
        WorkflowRunRequest(workflow_id="restart-flow", delay_seconds=60),
        _admin={"role": "admin"},
    )

    workflow._WORKFLOW_STORAGE.clear()
    workflow._WORKFLOW_RUNS.clear()
    workflow._EXECUTION_QUEUE.clear()
    workflow._EXECUTION_STATES.clear()
    workflow._QUEUE_WORKER_RUNNING = False

    restored = workflow.restore_pending_workflow_runs()

    assert restored == 1
    assert run.run_id in workflow._WORKFLOW_RUNS
    assert workflow._EXECUTION_QUEUE[0]["run_id"] == run.run_id


@pytest.mark.anyio
async def test_controller_result_tracks_workflow_terminal_state() -> None:
    db = workflow.SessionLocal()
    try:
        db.add(models.Controller(
            id="controller-test",
            name="Controller Test",
            trigger_type="manual",
            enabled=True,
            config='{"workflow_id":"controller-flow"}',
            success_count=0,
            failure_count=0,
        ))
        db.commit()
    finally:
        db.close()

    await workflow.store_workflow(
        WorkflowStorageCreate(
            id="controller-flow",
            name="Controller Flow",
            nodes=[WorkflowNode(id="step", name="Step", config={"action": "log", "message": "ok"})],
        ),
        _admin={"role": "admin"},
    )

    workflow._QUEUE_WORKER_RUNNING = True
    run = await workflow.enqueue_workflow_run("controller-flow", controller_id="controller-test")
    await workflow._execute_workflow(run.run_id)

    db = workflow.SessionLocal()
    try:
        controller = db.query(models.Controller).filter(models.Controller.id == "controller-test").first()
        assert controller is not None
        assert controller.success_count == 1
        assert controller.failure_count == 0
    finally:
        db.close()


@pytest.mark.anyio
async def test_workflow_persistence_surfaces_database_failures() -> None:
    workflow_payload = WorkflowStorageOut(
        id="db-fail-flow",
        name="DB Fail Flow",
        nodes=[WorkflowNode(id="step", name="Step")],
        created_at=workflow._now(),
        updated_at=workflow._now(),
    )
    db = workflow.SessionLocal()
    try:
        db.query(models.Workflow).delete()
        db.query(models.WorkflowNodeRecord).delete()
        db.commit()
    finally:
        db.close()

    original_session_local = workflow.SessionLocal
    class FailingSessionLocal:
        def __call__(self):
            raise RuntimeError("database boom")
    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr(workflow, "SessionLocal", FailingSessionLocal())
    try:
        with pytest.raises(RuntimeError, match="database boom"):
            workflow._persist_workflow_definition(workflow_payload)
        with pytest.raises(RuntimeError, match="database boom"):
            workflow._load_workflow_definition("db-fail-flow")

        run = WorkflowRunOut(
            run_id="db-fail-run",
            workflow_id="db-fail-flow",
            state=WorkflowState(status="queued", current_node=None, completed_nodes=[], error=None),
        )
        with pytest.raises(RuntimeError, match="database boom"):
            workflow._persist_run_state(run)
        with pytest.raises(RuntimeError, match="database boom"):
            workflow._load_run_state("db-fail-run")
    finally:
        monkeypatch.undo()
        workflow.SessionLocal = original_session_local


def test_admin_bulk_import_uses_single_transaction_and_safe_error_response(monkeypatch: pytest.MonkeyPatch) -> None:
    file_like = type("FakeUpload", (), {"read": lambda self, n: b"title,content\nAlpha,Body\nBeta,Body2\n"})()
    file = type("FakeFile", (), {"filename": "import.csv", "content_type": "text/csv", "file": file_like})()

    captured = {}

    class DummySession:
        def __init__(self):
            self.commits = 0
            self.rollbacks = 0
            self.added = []
            self.flushed = 0

        def add(self, obj):
            self.added.append(obj)

        def flush(self):
            self.flushed += 1

        def commit(self):
            self.commits += 1
            raise RuntimeError("db boom")

        def rollback(self):
            self.rollbacks += 1

    session = DummySession()
    monkeypatch.setattr(admin, "logger", type("L", (), {"exception": lambda *a, **k: captured.setdefault("logged", True)})())

    class DummyMemory:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)

    class DummyPost:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)
            self.id = 42

    monkeypatch.setattr(admin.models, "AiMemoryBrain", DummyMemory, raising=False)
    monkeypatch.setattr(admin.models, "Post", DummyPost, raising=False)

    with pytest.raises(HTTPException) as exc_info:
        admin.admin_bulk_import(file, session, _=object())
    assert exc_info.value.status_code == 500
    assert exc_info.value.detail == "Database error during import"
    assert session.rollbacks == 1
    assert captured.get("logged") is True


def test_json_formatter_includes_exception_traceback() -> None:
    from app.logging_config import JsonLogFormatter

    try:
        raise RuntimeError("boom")
    except RuntimeError:
        record = logging.LogRecord(
            name="test.logger",
            level=logging.ERROR,
            pathname=__file__,
            lineno=1,
            msg="failed",
            args=(),
            exc_info=sys.exc_info(),
        )
        record.operation = "workflow_persistence"
        record.error_type = "database_failure"

    payload = json.loads(JsonLogFormatter().format(record))
    assert payload["message"] == "failed"
    assert payload["exception"]
    assert "RuntimeError: boom" in payload["exception"]
    assert payload["operation"] == "workflow_persistence"
    assert payload["error_type"] == "database_failure"


def test_schedule_run_does_not_publish_in_memory_queue_when_db_persistence_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    run = WorkflowRunOut(
        run_id="schedule-db-fail",
        workflow_id="schedule-flow",
        state=WorkflowState(status="queued", current_node=None, completed_nodes=[], error=None),
    )
    workflow._WORKFLOW_RUNS[run.run_id] = run

    class FailingSessionLocal:
        def __call__(self):
            raise RuntimeError("database boom")

    monkeypatch.setattr(workflow, "SessionLocal", FailingSessionLocal())
    with pytest.raises(RuntimeError, match="database boom"):
        workflow._schedule_run(run.run_id)

    assert workflow._EXECUTION_QUEUE == []


def test_claim_job_propagates_database_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    class FailingSessionLocal:
        def __call__(self):
            raise RuntimeError("database boom")

    monkeypatch.setattr(workflow, "SessionLocal", FailingSessionLocal())
    with pytest.raises(RuntimeError, match="database boom"):
        workflow._claim_job("claim-db-fail")


def test_mark_job_terminal_propagates_database_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    class FailingSessionLocal:
        def __call__(self):
            raise RuntimeError("database boom")

    monkeypatch.setattr(workflow, "SessionLocal", FailingSessionLocal())
    with pytest.raises(RuntimeError, match="database boom"):
        workflow._mark_job_terminal("terminal-db-fail", "failed")


def test_record_controller_result_propagates_database_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    workflow._CONTROLLER_RUNS["controller-db-fail-run"] = "controller-db-fail"

    class FailingSessionLocal:
        def __call__(self):
            raise RuntimeError("database boom")

    monkeypatch.setattr(workflow, "SessionLocal", FailingSessionLocal())
    with pytest.raises(RuntimeError, match="database boom"):
        workflow._record_controller_result("controller-db-fail-run", "failed")


def test_restore_pending_workflow_runs_propagates_database_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    class FailingSessionLocal:
        def __call__(self):
            raise RuntimeError("database boom")

    monkeypatch.setattr(workflow, "SessionLocal", FailingSessionLocal())
    with pytest.raises(RuntimeError, match="database boom"):
        workflow.restore_pending_workflow_runs()


@pytest.mark.anyio
async def test_queue_worker_keeps_job_queued_when_claim_database_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    run = WorkflowRunOut(
        run_id="worker-db-fail",
        workflow_id="worker-flow",
        state=WorkflowState(status="queued", current_node=None, completed_nodes=[], error=None),
    )
    workflow._WORKFLOW_RUNS[run.run_id] = run
    item = {
        "run_id": run.run_id,
        "priority": 1,
        "queued_at": workflow._now(),
        "scheduled_for": workflow._now(),
    }
    workflow._EXECUTION_QUEUE.append(item)

    logged = {}
    monkeypatch.setattr(
        workflow,
        "logger",
        type("Logger", (), {"exception": lambda self, *args, **kwargs: logged.setdefault("called", True)})(),
    )

    def failing_claim(run_id: str) -> bool:
        raise RuntimeError("database boom")

    monkeypatch.setattr(workflow, "_claim_job", failing_claim)

    class StopAfterFirstRetry(Exception):
        pass

    async def stop_after_first_retry(delay: float) -> None:
        assert delay == 1.0
        raise StopAfterFirstRetry()

    monkeypatch.setattr(workflow, "_queue_worker_sleep", stop_after_first_retry)
    with pytest.raises(StopAfterFirstRetry):
        await workflow._queue_worker()

    assert workflow._EXECUTION_QUEUE == [item]
    assert workflow._QUEUE_WORKER_RUNNING is False
    assert logged.get("called") is True


def test_claim_job_due_time_and_single_winner() -> None:
    db = workflow.SessionLocal()
    try:
        now = workflow._now()
        db.add(
            models.ScheduledWorkflowJob(
                id="job-claim-winner",
                run_id="claim-winner",
                workflow_id="claim-flow",
                priority=1,
                scheduled_for=now,
                status="queued",
            )
        )
        db.commit()
    finally:
        db.close()

    assert workflow._claim_job("claim-winner") is True
    assert workflow._claim_job("claim-winner") is False

    db = workflow.SessionLocal()
    try:
        job = db.query(models.ScheduledWorkflowJob).filter(
            models.ScheduledWorkflowJob.run_id == "claim-winner"
        ).one()
        assert job.status == "running"
        assert job.claimed_by == workflow._WORKER_ID
        assert job.claimed_at is not None
    finally:
        db.close()


def test_claim_job_rejects_future_schedule() -> None:
    db = workflow.SessionLocal()
    try:
        db.add(
            models.ScheduledWorkflowJob(
                id="job-future-claim",
                run_id="future-claim",
                workflow_id="future-flow",
                priority=1,
                scheduled_for=workflow._now() + __import__("datetime").timedelta(minutes=5),
                status="queued",
            )
        )
        db.commit()
    finally:
        db.close()

    assert workflow._claim_job("future-claim") is False


@pytest.mark.anyio
async def test_restart_resume_skips_durable_completed_nodes(monkeypatch: pytest.MonkeyPatch) -> None:
    await workflow.store_workflow(
        WorkflowStorageCreate(
            id="resume-progress-flow",
            name="Resume progress flow",
            nodes=[
                WorkflowNode(id="first", name="First"),
                WorkflowNode(id="second", name="Second", depends_on=["first"]),
            ],
        ),
        _admin={"role": "admin"},
    )
    run = await workflow.run_workflow(
        "resume-progress-flow",
        WorkflowRunRequest(workflow_id="resume-progress-flow", delay_seconds=60),
        _admin={"role": "admin"},
    )
    run.state.status = "running"
    run.state.completed_nodes = ["first"]
    run.state.current_node = "second"
    workflow._persist_run_state(run)

    workflow._WORKFLOW_STORAGE.clear()
    workflow._WORKFLOW_RUNS.clear()
    workflow._EXECUTION_QUEUE.clear()
    workflow._EXECUTION_STATES.clear()
    workflow._QUEUE_WORKER_RUNNING = False
    assert workflow.restore_pending_workflow_runs() == 1

    executed: list[str] = []

    async def record_action(node, run_id: str) -> None:
        executed.append(node.id)

    monkeypatch.setattr(workflow, "_execute_node_action", record_action)
    await workflow._execute_workflow(run.run_id)

    assert executed == ["second"]
    recovered = workflow._load_run_state(run.run_id)
    assert recovered is not None
    assert recovered.state.status == "completed"
    assert recovered.state.completed_nodes == ["first", "second"]


@pytest.mark.anyio
async def test_claim_reclaims_running_job_without_claim_timestamp() -> None:
    await workflow.store_workflow(
        WorkflowStorageCreate(
            id="missing-lease-flow",
            name="Missing lease flow",
            nodes=[WorkflowNode(id="step", name="Step")],
        ),
        _admin={"role": "admin"},
    )
    run = await workflow.run_workflow(
        "missing-lease-flow",
        WorkflowRunRequest(workflow_id="missing-lease-flow", delay_seconds=60),
        _admin={"role": "admin"},
    )
    db = workflow.SessionLocal()
    try:
        job = db.query(models.ScheduledWorkflowJob).filter(
            models.ScheduledWorkflowJob.run_id == run.run_id
        ).one()
        job.status = "running"
        job.claimed_by = "dead-worker"
        job.claimed_at = None
        job.scheduled_for = workflow._now() - workflow.timedelta(seconds=1)
        db.commit()
    finally:
        db.close()

    assert workflow._claim_job(run.run_id) is True
    db = workflow.SessionLocal()
    try:
        job = db.query(models.ScheduledWorkflowJob).filter(
            models.ScheduledWorkflowJob.run_id == run.run_id
        ).one()
        assert job.status == "running"
        assert job.claimed_by == workflow._WORKER_ID
        assert job.claimed_at is not None
    finally:
        db.close()


@pytest.mark.anyio
async def test_qstash_dispatch_releases_claim_and_returns_retryable_status_on_execution_exception(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await workflow.store_workflow(
        WorkflowStorageCreate(
            id="qstash-recovery-flow",
            name="QStash recovery flow",
            nodes=[WorkflowNode(id="step", name="Step")],
        ),
        _admin={"role": "admin"},
    )
    run = WorkflowRunOut(
        run_id="qstash-recovery-run",
        workflow_id="qstash-recovery-flow",
        state=WorkflowState(status="queued"),
    )
    workflow._WORKFLOW_RUNS[run.run_id] = run
    workflow._persist_run_state(run)
    db = workflow.SessionLocal()
    try:
        db.add(
            models.ScheduledWorkflowJob(
                id="job-qstash-recovery",
                run_id=run.run_id,
                workflow_id=run.workflow_id,
                priority=1,
                scheduled_for=workflow._now(),
                status="queued",
            )
        )
        db.commit()
    finally:
        db.close()

    class FakeReceiver:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

        def verify(self, **kwargs):
            return None

    qstash_module = ModuleType("qstash")
    qstash_module.Receiver = FakeReceiver
    monkeypatch.setitem(sys.modules, "qstash", qstash_module)
    monkeypatch.setenv("QSTASH_CURRENT_SIGNING_KEY", "current-test-key")
    monkeypatch.setenv("QSTASH_NEXT_SIGNING_KEY", "next-test-key")
    monkeypatch.setenv("QSTASH_DESTINATION_URL", "https://example.invalid")
    monkeypatch.setenv("CELERY_ENABLED", "false")

    async def fail_execution(run_id: str) -> None:
        raise RuntimeError("simulated persistence interruption")

    monkeypatch.setattr(workflow, "_execute_workflow", fail_execution)

    class FakeRequest:
        headers = {"Upstash-Signature": "signed-test-payload"}

        async def body(self) -> bytes:
            return json.dumps({"run_id": run.run_id}).encode("utf-8")

    with pytest.raises(HTTPException) as raised:
        await workflow.qstash_dispatch(FakeRequest())

    assert raised.value.status_code == 503
    db = workflow.SessionLocal()
    try:
        job = db.query(models.ScheduledWorkflowJob).filter(
            models.ScheduledWorkflowJob.run_id == run.run_id
        ).one()
        assert job.status == "queued"
        assert job.claimed_by is None
        assert job.claimed_at is None
    finally:
        db.close()


@pytest.mark.anyio
async def test_qstash_terminal_redelivery_repairs_job_status_without_reexecution(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await workflow.store_workflow(
        WorkflowStorageCreate(
            id="qstash-terminal-flow",
            name="QStash terminal flow",
            nodes=[WorkflowNode(id="step", name="Step")],
        ),
        _admin={"role": "admin"},
    )
    run = WorkflowRunOut(
        run_id="qstash-terminal-run",
        workflow_id="qstash-terminal-flow",
        state=WorkflowState(status="completed", completed_nodes=["step"]),
    )
    workflow._WORKFLOW_RUNS[run.run_id] = run
    workflow._persist_run_state(run)
    db = workflow.SessionLocal()
    try:
        db.add(
            models.ScheduledWorkflowJob(
                id="job-qstash-terminal",
                run_id=run.run_id,
                workflow_id=run.workflow_id,
                priority=1,
                scheduled_for=workflow._now(),
                status="queued",
            )
        )
        db.commit()
    finally:
        db.close()

    class FakeReceiver:
        def __init__(self, **kwargs):
            pass

        def verify(self, **kwargs):
            return None

    qstash_module = ModuleType("qstash")
    qstash_module.Receiver = FakeReceiver
    monkeypatch.setitem(sys.modules, "qstash", qstash_module)
    monkeypatch.setenv("QSTASH_CURRENT_SIGNING_KEY", "current-test-key")
    monkeypatch.setenv("QSTASH_NEXT_SIGNING_KEY", "next-test-key")
    monkeypatch.setenv("QSTASH_DESTINATION_URL", "https://example.invalid")

    async def unexpected_execution(run_id: str) -> None:
        raise AssertionError("terminal workflow must not execute twice")

    monkeypatch.setattr(workflow, "_execute_workflow", unexpected_execution)

    class FakeRequest:
        headers = {"Upstash-Signature": "signed-test-payload"}

        async def body(self) -> bytes:
            return json.dumps({"run_id": run.run_id}).encode("utf-8")

    result = await workflow.qstash_dispatch(FakeRequest())
    assert result == {"status": "completed", "run_id": run.run_id}

    db = workflow.SessionLocal()
    try:
        job = db.query(models.ScheduledWorkflowJob).filter(
            models.ScheduledWorkflowJob.run_id == run.run_id
        ).one()
        assert job.status == "completed"
    finally:
        db.close()


@pytest.mark.anyio
async def test_cancelled_qstash_execution_requeues_run_and_releases_claim(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await workflow.store_workflow(
        WorkflowStorageCreate(
            id="qstash-cancel-flow",
            name="QStash cancel flow",
            nodes=[WorkflowNode(id="step", name="Step")],
        ),
        _admin={"role": "admin"},
    )
    run = WorkflowRunOut(
        run_id="qstash-cancel-run",
        workflow_id="qstash-cancel-flow",
        state=WorkflowState(status="queued"),
    )
    workflow._WORKFLOW_RUNS[run.run_id] = run
    workflow._persist_run_state(run)
    db = workflow.SessionLocal()
    try:
        db.add(
            models.ScheduledWorkflowJob(
                id="job-qstash-cancel",
                run_id=run.run_id,
                workflow_id=run.workflow_id,
                priority=1,
                scheduled_for=workflow._now(),
                status="queued",
            )
        )
        db.commit()
    finally:
        db.close()

    assert workflow._claim_job(run.run_id) is True

    async def cancel_execution(self):
        raise asyncio.CancelledError()

    monkeypatch.setattr(workflow.WorkflowExecutor, "execute", cancel_execution)
    with pytest.raises(asyncio.CancelledError):
        await workflow._execute_workflow(run.run_id)

    assert run.state.status == "queued"
    db = workflow.SessionLocal()
    try:
        job = db.query(models.ScheduledWorkflowJob).filter(
            models.ScheduledWorkflowJob.run_id == run.run_id
        ).one()
        assert job.status == "queued"
        assert job.claimed_by is None
        assert job.claimed_at is None
        record = db.query(models.WorkflowRunRecord).filter(
            models.WorkflowRunRecord.id == run.run_id
        ).one()
        assert record.status == "queued"
    finally:
        db.close()
