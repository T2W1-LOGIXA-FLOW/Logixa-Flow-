from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models
from app.agent_recovery import recover_stale_agent_runs


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    models.Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine, autocommit=False, autoflush=False)()
    try:
        yield session
    finally:
        session.close()
        models.Base.metadata.drop_all(bind=engine)
        engine.dispose()


def test_recover_stale_agent_runs_marks_only_old_running_rows_failed(db):
    now = datetime(2026, 10, 15, 6, 40, tzinfo=timezone.utc)
    stale = models.AgentRun(
        objective="interrupted run",
        model="pending",
        status="running",
        created_at=now - timedelta(days=4),
        updated_at=now - timedelta(days=4),
    )
    recent = models.AgentRun(
        objective="recent run",
        model="pending",
        status="running",
        created_at=now - timedelta(hours=1),
        updated_at=now - timedelta(hours=1),
    )
    completed = models.AgentRun(
        objective="completed run",
        model="local",
        status="completed",
        created_at=now - timedelta(days=4),
        updated_at=now - timedelta(days=4),
    )
    db.add_all([stale, recent, completed])
    db.commit()

    recovered = recover_stale_agent_runs(db, now=now, stale_after_hours=24)
    db.refresh(stale)
    db.refresh(recent)
    db.refresh(completed)

    assert recovered == 1
    assert stale.status == "failed"
    assert stale.updated_at is not None
    recovered_at = stale.updated_at
    if recovered_at.tzinfo is None:
        recovered_at = recovered_at.replace(tzinfo=timezone.utc)
    assert recovered_at == now
    assert recent.status == "running"
    assert completed.status == "completed"


def test_recover_stale_agent_runs_does_not_commit_when_nothing_is_stale(db):
    now = datetime(2026, 10, 15, 6, 40, tzinfo=timezone.utc)
    recent = models.AgentRun(
        objective="recent run",
        model="pending",
        status="running",
        created_at=now - timedelta(hours=1),
        updated_at=now - timedelta(hours=1),
    )
    db.add(recent)
    db.commit()

    assert recover_stale_agent_runs(db, now=now, stale_after_hours=24) == 0
    db.refresh(recent)
    assert recent.status == "running"
