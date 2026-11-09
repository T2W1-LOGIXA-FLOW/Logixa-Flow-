from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException, WebSocketDisconnect
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models
from app.routers import workflow
from app.routers import workflow_qstash, workflow_websocket, workflow_execution, workflow_persistence
from app.schemas import WorkflowRunRequest, WorkflowStorageCreate, WorkflowNode


class FakeWebSocket:
    def __init__(self, incoming: list[str] | None = None) -> None:
        self.headers: dict[str, str] = {}
        self.sent: list[dict] = []
        self.closed_code: int | None = None
        self.incoming = list(incoming or [])
        self.accepted = False

    async def accept(self) -> None:
        self.accepted = True

    async def receive_text(self) -> str:
        if self.incoming:
            return self.incoming.pop(0)
        raise WebSocketDisconnect()

    async def send_json(self, message: dict) -> None:
        self.sent.append(message)

    async def close(self, code: int) -> None:
        self.closed_code = code


class IdleWebSocket(FakeWebSocket):
    async def receive_text(self) -> str:
        if self.incoming:
            return self.incoming.pop(0)
        await asyncio.Future()
        raise AssertionError("idle websocket receive unexpectedly completed")


@pytest.fixture(autouse=True)
def reset_workflow_state(monkeypatch: pytest.MonkeyPatch) -> None:
    workflow._WORKFLOW_STORAGE.clear()
    workflow._WORKFLOW_RUNS.clear()
    workflow._SUBSCRIBERS.clear()
    workflow._EXECUTION_QUEUE.clear()
    workflow._RUN_TASKS.clear()
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    session_factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    models.Base.metadata.create_all(bind=engine)
    monkeypatch.setattr(workflow, "SessionLocal", session_factory)
    monkeypatch.setattr(workflow_persistence, "SessionLocal", session_factory)
    yield
    engine.dispose()
    workflow._SUBSCRIBERS.clear()


@pytest.mark.anyio
async def test_workflow_storage_round_trip() -> None:
    payload = WorkflowStorageCreate(
        id="phase-2",
        name="Phase 2",
        nodes=[WorkflowNode(id="first", name="First task")],
    )
    stored = await workflow.store_workflow(payload, _admin={"role": "admin"})
    retrieved = await workflow.retrieve_workflow(stored.id, _admin={"role": "admin"})

    assert retrieved.id == "phase-2"
    assert retrieved.nodes[0].id == "first"


@pytest.mark.anyio
async def test_manual_workflow_pack_round_trip_redacts_secrets_and_rejects_duplicates() -> None:
    stored = await workflow.store_workflow(
        WorkflowStorageCreate(
            id="offline-runbook",
            name="Offline Runbook",
            nodes=[WorkflowNode(id="first", name="First task", config={"api_key": "never-export", "label": "safe"})],
        ),
        _admin={"role": "admin"},
    )

    pack = await workflow.export_workflow(stored.id, _admin={"role": "admin"})
    assert pack["export_version"] == "1.0.0"
    assert pack["workflow"]["nodes"][0]["config"]["api_key"] == "[redacted]"

    pack["workflow"]["id"] = "offline-runbook-copy"
    imported = await workflow.import_workflow(pack, _admin={"role": "admin"})
    assert imported.id == "offline-runbook-copy"

    with pytest.raises(HTTPException) as error:
        await workflow.import_workflow(pack, _admin={"role": "admin"})
    assert error.value.status_code == 409


@pytest.mark.anyio
async def test_workflow_orchestration_completes_and_broadcasts() -> None:
    await workflow.store_workflow(
        WorkflowStorageCreate(
            id="runbook",
            name="Runbook",
            nodes=[
                WorkflowNode(id="first", name="First task"),
                WorkflowNode(id="second", name="Second task"),
            ],
        ),
        _admin={"role": "admin"},
    )
    subscriber = FakeWebSocket()
    workflow._SUBSCRIBERS.add(subscriber)  # type: ignore[arg-type]

    run = await workflow.run_workflow(
        "runbook",
        WorkflowRunRequest(workflow_id="runbook"),
        _admin={"role": "admin"},
    )
    await asyncio.sleep(0)
    await asyncio.gather(*workflow._RUN_TASKS)

    assert workflow._WORKFLOW_RUNS[run.run_id].state.status == "completed"
    assert workflow._WORKFLOW_RUNS[run.run_id].state.completed_nodes == ["first", "second"]
    assert subscriber.sent[-1]["state"]["status"] == "completed"


@pytest.mark.anyio
async def test_workflow_websocket_authenticates_supabase_admin_with_first_message(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(workflow_websocket, "_verify_supabase_token", lambda token: {"sub": "admin-id", "role": "admin"})
    websocket = FakeWebSocket(['{"type":"auth","token":"supabase-access-token"}'])

    await workflow.workflow_telemetry(websocket)  # type: ignore[arg-type]

    assert websocket.accepted is True
    assert websocket.closed_code is None
    assert websocket.sent == [{"type": "auth.ok"}]
    assert websocket not in workflow._SUBSCRIBERS


@pytest.mark.anyio
async def test_workflow_websocket_rejects_missing_authentication(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(workflow_websocket, "_WEBSOCKET_AUTH_TIMEOUT_SECONDS", 0.001)
    websocket = IdleWebSocket()

    await workflow.workflow_telemetry(websocket)  # type: ignore[arg-type]

    assert websocket.accepted is True
    assert websocket.closed_code == 4401


@pytest.mark.anyio
@pytest.mark.parametrize("status_code", [401, 403])
async def test_workflow_websocket_rejects_invalid_or_expired_supabase_auth(
    monkeypatch: pytest.MonkeyPatch,
    status_code: int,
) -> None:
    def reject_token(_: str) -> None:
        raise HTTPException(status_code=status_code, detail="Invalid or expired session")

    monkeypatch.setattr(workflow_websocket, "_verify_supabase_token", reject_token)
    websocket = FakeWebSocket(['{"type":"auth","token":"invalid-or-expired"}'])

    await workflow.workflow_telemetry(websocket)  # type: ignore[arg-type]

    assert websocket.closed_code == (4403 if status_code == 403 else 4401)
    assert websocket.sent == []


@pytest.mark.anyio
async def test_workflow_websocket_closes_after_supabase_session_is_revoked(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    verification_count = 0

    def verify_session(_: str) -> None:
        nonlocal verification_count
        verification_count += 1
        if verification_count > 1:
            raise HTTPException(status_code=401, detail="Invalid or expired session")

    monkeypatch.setattr(workflow_websocket, "_WEBSOCKET_AUTH_RECHECK_SECONDS", 0.001)
    monkeypatch.setattr(workflow_websocket, "_verify_supabase_token", verify_session)
    websocket = IdleWebSocket(['{"type":"auth","token":"supabase-session"}'])

    await workflow.workflow_telemetry(websocket)  # type: ignore[arg-type]

    assert verification_count == 2
    assert websocket.closed_code == 4401
    assert websocket not in workflow._SUBSCRIBERS


@pytest.mark.anyio
async def test_qstash_dispatch_restores_durable_run_before_execution(monkeypatch: pytest.MonkeyPatch) -> None:
    restored = workflow.WorkflowRunOut(
        run_id="durable-run",
        workflow_id="durable-workflow",
        state=workflow.WorkflowState(status="queued"),
    )
    definition = WorkflowStorageCreate(
        id="durable-workflow",
        name="Durable workflow",
        nodes=[WorkflowNode(id="first", name="First task")],
    )
    monkeypatch.setenv("CELERY_ENABLED", "false")
    monkeypatch.setenv("QSTASH_CURRENT_SIGNING_KEY", "test-current")
    monkeypatch.setenv("QSTASH_NEXT_SIGNING_KEY", "test-next")
    monkeypatch.setenv("QSTASH_DESTINATION_URL", "https://logixa-flow.onrender.com")

    class FakeReceiver:
        def __init__(self, **_: str) -> None:
            pass
        def verify(self, **_: str) -> bool:
            return True

    class FakeRequest:
        headers = {"Upstash-Signature": "signed"}
        async def body(self) -> bytes:
            return b'{"run_id":"durable-run"}'

    monkeypatch.setattr("qstash.Receiver", FakeReceiver)
    monkeypatch.setattr(workflow_qstash, "_load_run_state", lambda _: restored)
    monkeypatch.setattr(workflow_qstash, "_load_workflow_definition", lambda _: workflow.WorkflowStorageOut(
        **definition.model_dump(), created_at=workflow._now(), updated_at=workflow._now()
    ))
    executed: list[str] = []
    async def fake_execute(run_id: str) -> None:
        executed.append(run_id)
    monkeypatch.setattr(workflow_qstash, "_execute_workflow", fake_execute)

    result = await workflow.qstash_dispatch(FakeRequest())  # type: ignore[arg-type]

    assert result == {"status": "already_running", "run_id": "durable-run"}
    assert executed == []
    assert "durable-run" in workflow._WORKFLOW_RUNS


@pytest.mark.anyio
async def test_qstash_dispatch_acknowledges_terminal_run_without_reexecution(monkeypatch: pytest.MonkeyPatch) -> None:
    terminal = workflow.WorkflowRunOut(
        run_id="terminal-run",
        workflow_id="terminal-workflow",
        state=workflow.WorkflowState(status="completed", completed_nodes=["first"]),
    )
    workflow._WORKFLOW_RUNS[terminal.run_id] = terminal
    monkeypatch.setenv("QSTASH_CURRENT_SIGNING_KEY", "test-current")
    monkeypatch.setenv("QSTASH_NEXT_SIGNING_KEY", "test-next")
    monkeypatch.setenv("QSTASH_DESTINATION_URL", "https://logixa-flow.onrender.com")

    class FakeReceiver:
        def __init__(self, **_: str) -> None:
            pass
        def verify(self, **_: str) -> bool:
            return True

    class FakeRequest:
        headers = {"Upstash-Signature": "signed"}
        async def body(self) -> bytes:
            return b'{"run_id":"terminal-run"}'

    monkeypatch.setattr("qstash.Receiver", FakeReceiver)
    executed: list[str] = []
    async def fake_execute(run_id: str) -> None:
        executed.append(run_id)
    monkeypatch.setattr(workflow_qstash, "_execute_workflow", fake_execute)

    result = await workflow.qstash_dispatch(FakeRequest())  # type: ignore[arg-type]

    assert result == {"status": "completed", "run_id": "terminal-run"}
    assert executed == []


@pytest.mark.anyio
async def test_qstash_dispatch_does_not_double_claim_a_fresh_run(monkeypatch: pytest.MonkeyPatch) -> None:
    queued = workflow.WorkflowRunOut(
        run_id="claimed-run",
        workflow_id="claimed-workflow",
        state=workflow.WorkflowState(status="queued"),
    )
    workflow._WORKFLOW_RUNS[queued.run_id] = queued
    monkeypatch.setenv("QSTASH_CURRENT_SIGNING_KEY", "test-current")
    monkeypatch.setenv("QSTASH_NEXT_SIGNING_KEY", "test-next")
    monkeypatch.setenv("QSTASH_DESTINATION_URL", "https://logixa-flow.onrender.com")

    class FakeReceiver:
        def __init__(self, **_: str) -> None:
            pass
        def verify(self, **_: str) -> bool:
            return True

    class FakeRequest:
        headers = {"Upstash-Signature": "signed"}
        async def body(self) -> bytes:
            return b'{"run_id":"claimed-run"}'

    monkeypatch.setattr("qstash.Receiver", FakeReceiver)
    monkeypatch.setattr(workflow_qstash, "_claim_job", lambda _: False)
    executed: list[str] = []
    async def fake_execute(run_id: str) -> None:
        executed.append(run_id)
    monkeypatch.setattr(workflow, "_execute_workflow", fake_execute)

    result = await workflow.qstash_dispatch(FakeRequest())  # type: ignore[arg-type]

    assert result == {"status": "already_running", "run_id": "claimed-run"}
    assert executed == []


def test_stale_workflow_claim_is_reclaimable(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeInspector:
        def has_table(self, _: str) -> bool:
            return True

    class FakeQuery:
        def __init__(self) -> None:
            self.filters = 0
            self.updated: dict | None = None
        def filter(self, *conditions: object) -> "FakeQuery":
            self.filters += len(conditions)
            return self
        def update(self, values: dict, synchronize_session: bool = False) -> int:
            self.updated = values
            assert synchronize_session is False
            return 1

    class FakeDB:
        bind = object()
        def __init__(self) -> None:
            self.query_obj = FakeQuery()
            self.committed = False
            self.rolled_back = False
        def query(self, _: object) -> FakeQuery:
            return self.query_obj
        def commit(self) -> None:
            self.committed = True
        def rollback(self) -> None:
            self.rolled_back = True
        def close(self) -> None:
            pass

    db = FakeDB()
    monkeypatch.setattr(workflow_persistence, "SessionLocal", lambda: db)
    monkeypatch.setattr(workflow_persistence, "inspect", lambda _: FakeInspector())
    monkeypatch.setattr(workflow_execution, "_WORKER_ID", "test-worker")
    monkeypatch.setenv("WORKFLOW_CLAIM_LEASE_SECONDS", "60")

    assert workflow._claim_job("stale-run") is True
    assert db.committed is True
    assert db.rolled_back is False
    assert db.query_obj.filters >= 1
    assert db.query_obj.updated is not None
    assert db.query_obj.updated["status"] == "running"
    assert db.query_obj.updated["claimed_by"] == "test-worker"


@pytest.mark.anyio
async def test_qstash_dispatch_rejects_missing_signature_or_signing_keys(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("QSTASH_CURRENT_SIGNING_KEY", "test-current")
    monkeypatch.setenv("QSTASH_NEXT_SIGNING_KEY", "test-next")

    class MissingSignatureRequest:
        headers: dict[str, str] = {}
        async def body(self) -> bytes:
            return b'{"run_id":"missing-signature"}'

    with pytest.raises(HTTPException) as missing_signature:
        await workflow.qstash_dispatch(MissingSignatureRequest())  # type: ignore[arg-type]
    assert missing_signature.value.status_code == 401

    monkeypatch.setenv("QSTASH_CURRENT_SIGNING_KEY", "")
    class SignedRequest:
        headers = {"Upstash-Signature": "signed"}
        async def body(self) -> bytes:
            return b'{"run_id":"missing-key"}'

    with pytest.raises(HTTPException) as missing_key:
        await workflow.qstash_dispatch(SignedRequest())  # type: ignore[arg-type]
    assert missing_key.value.status_code == 401


@pytest.mark.anyio
async def test_qstash_dispatch_rejects_invalid_signature_before_loading_run(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("QSTASH_CURRENT_SIGNING_KEY", "test-current")
    monkeypatch.setenv("QSTASH_NEXT_SIGNING_KEY", "test-next")
    monkeypatch.setenv("QSTASH_DESTINATION_URL", "https://logixa-flow.onrender.com")

    class RejectingReceiver:
        def __init__(self, **_: str) -> None:
            pass
        def verify(self, **_: str) -> bool:
            raise ValueError("signature mismatch")

    class SignedRequest:
        headers = {"Upstash-Signature": "invalid"}
        async def body(self) -> bytes:
            return b'{"run_id":"must-not-load"}'

    loaded: list[str] = []
    monkeypatch.setattr("qstash.Receiver", RejectingReceiver)
    monkeypatch.setattr(workflow_qstash, "_load_run_state", lambda run_id: loaded.append(run_id))
    with pytest.raises(HTTPException) as error:
        await workflow.qstash_dispatch(SignedRequest())  # type: ignore[arg-type]

    assert error.value.status_code == 401
    assert loaded == []


@pytest.mark.anyio
async def test_qstash_dispatch_releases_claim_and_returns_retryable_503_on_execution_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    queued = workflow.WorkflowRunOut(
        run_id="retryable-run",
        workflow_id="retryable-workflow",
        state=workflow.WorkflowState(status="queued"),
    )
    workflow._WORKFLOW_RUNS[queued.run_id] = queued
    monkeypatch.setenv("QSTASH_CURRENT_SIGNING_KEY", "test-current")
    monkeypatch.setenv("QSTASH_NEXT_SIGNING_KEY", "test-next")
    monkeypatch.setenv("QSTASH_DESTINATION_URL", "https://logixa-flow.onrender.com")
    monkeypatch.setenv("CELERY_ENABLED", "false")

    class AcceptingReceiver:
        def __init__(self, **_: str) -> None:
            pass
        def verify(self, **_: str) -> bool:
            return True

    class SignedRequest:
        headers = {"Upstash-Signature": "valid"}
        async def body(self) -> bytes:
            return b'{"run_id":"retryable-run"}'

    released: list[str] = []
    async def fail_execution(_: str) -> None:
        raise RuntimeError("temporary persistence failure")

    monkeypatch.setattr("qstash.Receiver", AcceptingReceiver)
    monkeypatch.setattr(workflow_qstash, "_claim_job", lambda _: True)
    monkeypatch.setattr(workflow_qstash, "_execute_workflow", fail_execution)
    monkeypatch.setattr(workflow_qstash, "_release_job_claim", lambda run_id: released.append(run_id))

    with pytest.raises(HTTPException) as error:
        await workflow.qstash_dispatch(SignedRequest())  # type: ignore[arg-type]

    assert error.value.status_code == 503
    assert released == ["retryable-run"]
