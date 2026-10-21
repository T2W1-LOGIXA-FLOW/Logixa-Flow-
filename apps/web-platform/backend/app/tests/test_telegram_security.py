from __future__ import annotations

import pytest
from fastapi import HTTPException

from ..routers import telegram as telegram_router
from ..routers.telegram import AdminTelegramSendPayload, _authorize_telegram_actor


def test_telegram_actor_allowlists_fail_closed_in_production(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.delenv("TELEGRAM_ALLOWED_USER_IDS", raising=False)
    monkeypatch.delenv("TELEGRAM_ALLOWED_CHAT_IDS", raising=False)

    with pytest.raises(HTTPException) as error:
        _authorize_telegram_actor(user_id=123, chat_id=-456)

    assert error.value.status_code == 503


def test_telegram_actor_allowlists_accept_only_configured_ids(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("TELEGRAM_ALLOWED_USER_IDS", "123, 789")
    monkeypatch.setenv("TELEGRAM_ALLOWED_CHAT_IDS", "-456")

    _authorize_telegram_actor(user_id=123, chat_id=-456)

    with pytest.raises(HTTPException) as wrong_user:
        _authorize_telegram_actor(user_id=999, chat_id=-456)
    assert wrong_user.value.status_code == 403

    with pytest.raises(HTTPException) as wrong_chat:
        _authorize_telegram_actor(user_id=123, chat_id=-789)
    assert wrong_chat.value.status_code == 403


def test_telegram_actor_allowlists_are_optional_outside_production(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.delenv("TELEGRAM_ALLOWED_USER_IDS", raising=False)
    monkeypatch.delenv("TELEGRAM_ALLOWED_CHAT_IDS", raising=False)

    _authorize_telegram_actor(user_id=123, chat_id=-456)


@pytest.mark.asyncio
async def test_admin_telegram_send_fails_closed_when_not_configured(monkeypatch):
    monkeypatch.setattr(telegram_router, "telegram_configured", lambda: False)
    monkeypatch.setattr(telegram_router, "telegram_enabled", lambda: True)

    with pytest.raises(HTTPException) as error:
        await telegram_router.send_admin_telegram_message(
            AdminTelegramSendPayload(message="test message"),
            _={"sub": "admin-test"},
        )

    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_admin_telegram_send_rejects_dry_run_or_delivery_failure(monkeypatch):
    monkeypatch.setattr(telegram_router, "telegram_configured", lambda: True)
    monkeypatch.setattr(telegram_router, "telegram_enabled", lambda: True)

    async def dry_run(*args, **kwargs):
        return None

    monkeypatch.setattr(telegram_router, "send_telegram_message", dry_run)
    with pytest.raises(HTTPException) as error:
        await telegram_router.send_admin_telegram_message(
            AdminTelegramSendPayload(message="test message"),
            _={"sub": "admin-test"},
        )

    assert error.value.status_code == 502


@pytest.mark.asyncio
async def test_admin_telegram_send_reports_only_confirmed_delivery(monkeypatch):
    monkeypatch.setattr(telegram_router, "telegram_configured", lambda: True)
    monkeypatch.setattr(telegram_router, "telegram_enabled", lambda: True)
    captured = {}

    async def send_message(message, *, topic_id=None):
        captured["message"] = message
        captured["topic_id"] = topic_id
        return {"ok": True, "result": {"message_id": 42}}

    monkeypatch.setattr(telegram_router, "send_telegram_message", send_message)
    result = await telegram_router.send_admin_telegram_message(
        AdminTelegramSendPayload(message="approved test", topic_id=7),
        _={"sub": "admin-test"},
    )

    assert captured == {"message": "approved test", "topic_id": 7}
    assert result == {"success": True, "delivered": True, "message_id": 42}
