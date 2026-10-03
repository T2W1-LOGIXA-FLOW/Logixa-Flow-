from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException, WebSocketDisconnect

from app.routers import workflow
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
def reset_workflow_state() -> None:
    workflow._WORKFLOW_STORAGE.clear()
    workflow._WORKFLOW_RUNS.clear()
    workflow._SUBSCRIBERS.clear()
    yield
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
    monkeypatch.setattr(workflow, "_verify_supabase_token", lambda token: {"sub": "admin-id", "role": "admin"})
    websocket = FakeWebSocket(['{"type":"auth","token":"supabase-access-token"}'])

    await workflow.workflow_telemetry(websocket)  # type: ignore[arg-type]

    assert websocket.accepted is True
    assert websocket.closed_code is None
    assert websocket.sent == [{"type": "auth.ok"}]
    assert websocket not in workflow._SUBSCRIBERS


@pytest.mark.anyio
async def test_workflow_websocket_rejects_missing_authentication(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(workflow, "_WEBSOCKET_AUTH_TIMEOUT_SECONDS", 0.001)
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

    monkeypatch.setattr(workflow, "_verify_supabase_token", reject_token)
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

    monkeypatch.setattr(workflow, "_WEBSOCKET_AUTH_RECHECK_SECONDS", 0.001)
    monkeypatch.setattr(workflow, "_verify_supabase_token", verify_session)
    websocket = IdleWebSocket(['{"type":"auth","token":"supabase-session"}'])

    await workflow.workflow_telemetry(websocket)  # type: ignore[arg-type]

    assert verification_count == 2
    assert websocket.closed_code == 4401
    assert websocket not in workflow._SUBSCRIBERS
