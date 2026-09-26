from __future__ import annotations

import asyncio

import pytest
from fastapi import WebSocketDisconnect

from app.routers import workflow
from app.security import create_access_token
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
async def test_workflow_websocket_authenticates_browser_clients_with_first_message() -> None:
    token = create_access_token("admin")
    websocket = FakeWebSocket([f'{{"type":"auth","token":"{token}"}}'])

    await workflow.workflow_telemetry(websocket)  # type: ignore[arg-type]

    assert websocket.accepted is True
    assert websocket.closed_code is None
    assert websocket not in workflow._SUBSCRIBERS


@pytest.mark.anyio
async def test_workflow_websocket_rejects_unauthenticated_clients() -> None:
    websocket = FakeWebSocket(['{"type":"auth","token":"invalid"}'])

    await workflow.workflow_telemetry(websocket)  # type: ignore[arg-type]

    assert websocket.accepted is True
    assert websocket.closed_code == 4401
