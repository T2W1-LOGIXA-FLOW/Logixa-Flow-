from __future__ import annotations

from fastapi.testclient import TestClient

from ..database import get_db
from ..main import app
from ..routers import agent as agent_router
from ..routers import telegram as telegram_router


def test_agent_interrupt_requires_admin():
    app.dependency_overrides.pop(agent_router.require_admin, None)
    client = TestClient(app)
    try:
        response = client.post(
            "/api/agent/interrupt/session-1",
            json={"action": "pause"},
        )
        assert response.status_code == 401
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_agent_interrupt_validates_request_and_does_not_claim_runtime_application(monkeypatch):
    app.dependency_overrides[agent_router.require_admin] = lambda: {
        "sub": "admin-test",
        "role": "admin",
    }
    client = TestClient(app)
    try:
        invalid = client.post(
            "/api/agent/interrupt/session-1",
            json={"action": "unknown"},
        )
        assert invalid.status_code == 422

        accepted = client.post(
            "/api/agent/interrupt/session-1",
            json={"action": "pause"},
        )
        assert accepted.status_code == 202
        assert accepted.json()["runtime_applied"] is False
        assert accepted.json()["status"] == "recorded"
    finally:
        app.dependency_overrides.pop(agent_router.require_admin, None)


def test_telegram_retry_command_uses_authenticated_webhook_executor(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("TELEGRAM_WEBHOOK_SECRET", "test-webhook-secret")
    monkeypatch.delenv("TELEGRAM_ALLOWED_USER_IDS", raising=False)
    monkeypatch.delenv("TELEGRAM_ALLOWED_CHAT_IDS", raising=False)
    captured = {}

    async def fake_execute(payload, *, db):
        captured["action"] = payload.action
        captured["user_id"] = payload.user_id
        captured["chat_id"] = payload.chat_id
        return {"status": "ok", "action": "workflow_retry"}

    monkeypatch.setattr(telegram_router, "_execute_telegram_action", fake_execute)
    def fake_db():
        yield object()

    app.dependency_overrides[get_db] = fake_db
    client = TestClient(app)
    try:
        response = client.post(
            "/api/telegram/webhook",
            headers={"X-Telegram-Bot-Api-Secret-Token": "test-webhook-secret"},
            json={
                "message": {
                    "text": "/retry workflow-123",
                    "message_thread_id": 7,
                    "chat": {"id": 456},
                    "from": {"id": 789, "username": "operator"},
                }
            },
        )
        assert response.status_code == 200
        assert response.json()["action"] == "workflow_retry"
        assert captured == {
            "action": "logixa_wf_retry:workflow-123",
            "user_id": 789,
            "chat_id": 456,
        }
    finally:
        app.dependency_overrides.pop(get_db, None)
