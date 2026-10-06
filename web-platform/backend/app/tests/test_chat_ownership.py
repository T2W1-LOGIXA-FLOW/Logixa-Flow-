from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import models, schemas
from app.routers import chat


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    models.ChatSession.__table__.create(engine)
    models.ChatMessage.__table__.create(engine)
    models.AnalyticsEvent.__table__.create(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def admin(subject: str) -> dict[str, str]:
    return {"sub": subject, "role": "admin"}


def test_owner_assignment_and_owner_scoped_lifecycle(db, monkeypatch):
    monkeypatch.setattr(
        chat,
        "generate_ai_response",
        lambda *args, **kwargs: {
            "content": "safe response",
            "agent_id": "default",
            "model_used": "local-planner",
            "tokens_used": 0,
            "cost_estimate": 0.0,
        },
    )
    request = schemas.ChatQueryRequest(query="What is the current status?")

    result = chat.chat_query(request, db=db, admin=admin("owner-a"))
    session = db.query(models.ChatSession).one()
    assert session.owner_id == "owner-a"
    assert result.session_id == session.session_id

    sessions = chat.get_chat_sessions(limit=20, offset=0, db=db, admin=admin("owner-a"))
    assert [item.session_id for item in sessions] == [session.session_id]
    messages = chat.get_chat_messages(session.session_id, limit=50, offset=0, db=db, admin=admin("owner-a"))
    assert len(messages) == 2

    chat.update_session_title(session.session_id, "Renamed", db=db, admin=admin("owner-a"))
    assert db.query(models.ChatSession).one().title == "Renamed"

    chat.delete_session(session.session_id, db=db, admin=admin("owner-a"))
    deleted = db.query(models.ChatSession).one()
    assert deleted.is_active is False
    assert deleted.deleted_at is not None
    assert deleted.deleted_by == "owner-a"
    assert chat.get_chat_sessions(limit=20, offset=0, db=db, admin=admin("owner-a")) == []
    assert chat.get_chat_stats(db=db, admin=admin("owner-a"))["total_messages"] == 0
    audit = db.query(models.AnalyticsEvent).one()
    assert "safe response" not in audit.details
    assert "owner-a" in audit.details
    assert "soft_delete" in audit.details
    with pytest.raises(HTTPException) as exc_info:
        chat.delete_session(session.session_id, db=db, admin=admin("owner-a"))
    assert exc_info.value.status_code == 404


def test_non_owner_and_ownerless_sessions_are_denied(db):
    owned = models.ChatSession(
        session_id="owned",
        owner_id="owner-a",
        title="Owned",
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    legacy = models.ChatSession(
        session_id="legacy",
        owner_id=None,
        title="Legacy",
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add_all([owned, legacy])
    db.commit()

    assert chat.get_chat_sessions(limit=20, offset=0, db=db, admin=admin("owner-b")) == []
    with pytest.raises(HTTPException) as exc_info:
        chat.get_chat_session("owned", db=db, admin=admin("owner-b"))
    assert exc_info.value.status_code == 404
    with pytest.raises(HTTPException) as exc_info:
        chat.get_chat_session("legacy", db=db, admin=admin("owner-a"))
    assert exc_info.value.status_code == 404


def test_public_query_is_blocked_when_user_ai_is_disabled(db, monkeypatch):
    monkeypatch.setenv("USER_AI_ENABLED", "false")
    monkeypatch.setattr(chat.rate_limiter, "allow", lambda *args, **kwargs: True)

    with pytest.raises(HTTPException) as exc_info:
        chat.public_chat_query(schemas.ChatQueryRequest(query="Public question"), db=db)

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Public AI is temporarily disabled"


def test_public_query_does_not_create_admin_sessions(db, monkeypatch):
    monkeypatch.setattr(
        chat,
        "generate_ai_response",
        lambda *args, **kwargs: {
            "content": "public response",
            "agent_id": "public",
            "model_used": "local-planner",
            "tokens_used": 0,
            "cost_estimate": 0.0,
        },
    )
    monkeypatch.setattr(chat.rate_limiter, "allow", lambda *args, **kwargs: True)

    result = chat.public_chat_query(
        schemas.ChatQueryRequest(query="Public question"),
        db=db,
    )
    assert result["response"] == "public response"
    assert db.query(models.ChatSession).count() == 0
    assert db.query(models.ChatMessage).count() == 0


def test_public_query_has_dedicated_rate_limit(monkeypatch, db):
    calls = {"count": 0}

    monkeypatch.setattr(
        chat,
        "generate_ai_response",
        lambda *args, **kwargs: {
            "content": "public response",
            "agent_id": "public",
            "model_used": "local-planner",
            "tokens_used": 0,
            "cost_estimate": 0,
        },
    )

    def allow(*args, **kwargs):
        calls["count"] += 1
        return calls["count"] <= 5

    monkeypatch.setattr(chat.rate_limiter, "allow", allow)

    request = schemas.ChatQueryRequest(query="Public question")
    for _ in range(5):
        assert chat.public_chat_query(request, db=db)["response"] == "public response"

    with pytest.raises(HTTPException) as exc_info:
        chat.public_chat_query(request, db=db)

    assert exc_info.value.status_code == 429
