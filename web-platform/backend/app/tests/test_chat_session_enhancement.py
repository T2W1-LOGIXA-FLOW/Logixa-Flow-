from datetime import datetime, timedelta, timezone

import pytest
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


def test_restore_and_transfer_require_current_owner(db):
    session = models.ChatSession(
        session_id="enhanced",
        owner_id="owner-a",
        title="Enhanced",
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(session)
    db.commit()
    restored = chat.restore_chat_session("enhanced", db=db, admin=admin("owner-a"))
    assert restored["session"].session_id == "enhanced"
    result = chat.transfer_chat_session(
        "enhanced",
        schemas.ChatOwnershipTransfer(new_owner_id="owner-b"),
        db=db,
        admin=admin("owner-a"),
    )
    assert result["owner_id"] == "owner-b"
    assert db.query(models.ChatSession).one().owner_id == "owner-b"


def test_cleanup_soft_deletes_only_owned_stale_sessions(db):
    stale = models.ChatSession(
        session_id="stale-enhanced",
        owner_id="owner-a",
        title="Stale",
        is_active=True,
        created_at=datetime.now(timezone.utc) - timedelta(days=40),
        updated_at=datetime.now(timezone.utc) - timedelta(days=40),
    )
    db.add(stale)
    db.commit()
    result = chat.cleanup_chat_sessions(older_than_days=30, db=db, admin=admin("owner-a"))
    assert result["cleaned"] == 1
    assert db.query(models.ChatSession).one().is_active is False
