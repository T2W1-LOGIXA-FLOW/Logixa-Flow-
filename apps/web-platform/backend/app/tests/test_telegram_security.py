from __future__ import annotations

import pytest
from fastapi import HTTPException

from ..routers.telegram import _authorize_telegram_actor


def test_telegram_actor_allowlists_fail_closed_in_production(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.delenv("TELEGRAM_ALLOWED_USER_IDS", raising=False)
    monkeypatch.delenv("TELEGRAM_ALLOWED_CHAT_IDS", raising=False)
    monkeypatch.delenv("TELEGRAM_ALLOWED_TOPIC_IDS", raising=False)

    with pytest.raises(HTTPException) as error:
        _authorize_telegram_actor(user_id=123, chat_id=-456, topic_id=5)

    assert error.value.status_code == 503


def test_telegram_actor_allowlists_accept_only_configured_ids(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("TELEGRAM_ALLOWED_USER_IDS", "123, 789")
    monkeypatch.setenv("TELEGRAM_ALLOWED_CHAT_IDS", "-456")
    monkeypatch.setenv("TELEGRAM_ALLOWED_TOPIC_IDS", "5")

    _authorize_telegram_actor(user_id=123, chat_id=-456, topic_id=5)

    with pytest.raises(HTTPException) as wrong_topic:
        _authorize_telegram_actor(user_id=123, chat_id=-456, topic_id=6)
    assert wrong_topic.value.status_code == 403

    with pytest.raises(HTTPException) as missing_topic:
        _authorize_telegram_actor(user_id=123, chat_id=-456)
    assert missing_topic.value.status_code == 403

    with pytest.raises(HTTPException) as wrong_user:
        _authorize_telegram_actor(user_id=999, chat_id=-456, topic_id=5)
    assert wrong_user.value.status_code == 403

    with pytest.raises(HTTPException) as wrong_chat:
        _authorize_telegram_actor(user_id=123, chat_id=-789, topic_id=5)
    assert wrong_chat.value.status_code == 403


def test_telegram_actor_allowlists_are_optional_outside_production(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.delenv("TELEGRAM_ALLOWED_USER_IDS", raising=False)
    monkeypatch.delenv("TELEGRAM_ALLOWED_CHAT_IDS", raising=False)
    monkeypatch.delenv("TELEGRAM_ALLOWED_TOPIC_IDS", raising=False)

    _authorize_telegram_actor(user_id=123, chat_id=-456)
