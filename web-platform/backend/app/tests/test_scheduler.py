from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import models
from app import main  # noqa: F401  # Initialize routers before scheduler import to avoid the app package cycle.
from app import scheduler


@pytest.fixture
def scheduler_session_factory():
    engine = create_engine("sqlite:///:memory:")
    models.Base.metadata.create_all(bind=engine)
    factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    try:
        yield factory
    finally:
        engine.dispose()


def test_scheduled_preview_claim_persists_cooldown(scheduler_session_factory) -> None:
    now = datetime(2026, 10, 12, 4, 0, tzinfo=timezone.utc)
    db = scheduler_session_factory()
    try:
        assert scheduler._claim_scheduled_preview_slot(
            db,
            interval_hours=24,
            message="scheduled brief",
            now=now,
        )
        setting = db.query(models.AppSetting).filter_by(
            key="scheduler_daily_preview_last_attempt"
        ).one()
        assert datetime.fromisoformat(setting.value) == now
    finally:
        db.close()


def test_recent_preview_memory_bootstraps_cooldown(scheduler_session_factory) -> None:
    now = datetime(2026, 10, 12, 4, 0, tzinfo=timezone.utc)
    attempted_at = now - timedelta(hours=2)
    db = scheduler_session_factory()
    try:
        db.add(
            models.AiMemoryBrain(
                category="Supply Chain",
                source_title="Daily Preview: prior attempt",
                prompt="scheduled brief",
                content="private preview",
                summary="preview",
                status="pending",
                is_public=False,
                created_at=attempted_at,
                updated_at=attempted_at,
            )
        )
        db.commit()

        assert not scheduler._claim_scheduled_preview_slot(
            db,
            interval_hours=24,
            message="scheduled brief",
            now=now,
        )
        setting = db.query(models.AppSetting).filter_by(
            key="scheduler_daily_preview_last_attempt"
        ).one()
        assert datetime.fromisoformat(setting.value) == attempted_at
    finally:
        db.close()


def test_recent_agent_attempt_bootstraps_cooldown_even_without_memory(
    scheduler_session_factory,
) -> None:
    now = datetime(2026, 10, 12, 4, 0, tzinfo=timezone.utc)
    attempted_at = now - timedelta(minutes=10)
    db = scheduler_session_factory()
    try:
        db.add(
            models.AgentRun(
                objective="scheduled brief",
                model="pending",
                status="failed",
                input_context="{}",
                source_ids="[]",
                created_at=attempted_at,
                updated_at=attempted_at,
            )
        )
        db.commit()

        assert not scheduler._claim_scheduled_preview_slot(
            db,
            interval_hours=24,
            message="scheduled brief",
            now=now,
        )
    finally:
        db.close()


def test_expired_cooldown_allows_next_scheduled_preview(scheduler_session_factory) -> None:
    now = datetime(2026, 10, 12, 4, 0, tzinfo=timezone.utc)
    db = scheduler_session_factory()
    try:
        db.add(
            models.AppSetting(
                key="scheduler_daily_preview_last_attempt",
                value=(now - timedelta(hours=25)).isoformat(),
            )
        )
        db.commit()

        assert scheduler._claim_scheduled_preview_slot(
            db,
            interval_hours=24,
            message="scheduled brief",
            now=now,
        )
        setting = db.query(models.AppSetting).filter_by(
            key="scheduler_daily_preview_last_attempt"
        ).one()
        assert datetime.fromisoformat(setting.value) == now
    finally:
        db.close()


def test_recent_durable_cooldown_skips_repeated_startup(scheduler_session_factory) -> None:
    now = datetime(2026, 10, 12, 4, 0, tzinfo=timezone.utc)
    db = scheduler_session_factory()
    try:
        db.add(
            models.AppSetting(
                key="scheduler_daily_preview_last_attempt",
                value=(now - timedelta(minutes=2)).isoformat(),
            )
        )
        db.commit()

        assert not scheduler._claim_scheduled_preview_slot(
            db,
            interval_hours=24,
            message="scheduled brief",
            now=now,
        )
    finally:
        db.close()


def test_recent_preview_memory_overrides_stale_cooldown_setting(
    scheduler_session_factory,
) -> None:
    now = datetime(2026, 10, 12, 4, 0, tzinfo=timezone.utc)
    attempted_at = now - timedelta(hours=1)
    db = scheduler_session_factory()
    try:
        db.add(
            models.AppSetting(
                key="scheduler_daily_preview_last_attempt",
                value=(now - timedelta(hours=25)).isoformat(),
            )
        )
        db.add(
            models.AiMemoryBrain(
                category="Supply Chain",
                source_title="Daily Preview: manual attempt",
                prompt="scheduled brief",
                content="private preview",
                summary="preview",
                status="pending",
                is_public=False,
                created_at=attempted_at,
                updated_at=attempted_at,
            )
        )
        db.commit()

        assert not scheduler._claim_scheduled_preview_slot(
            db,
            interval_hours=24,
            message="scheduled brief",
            now=now,
        )
    finally:
        db.close()


def test_scheduled_preview_skips_provider_call_during_cooldown(
    scheduler_session_factory, monkeypatch: pytest.MonkeyPatch
) -> None:
    now = datetime.now(timezone.utc)
    monkeypatch.setattr(scheduler, "SessionLocal", scheduler_session_factory)
    db = scheduler_session_factory()
    try:
        db.add(
            models.AppSetting(
                key="scheduler_daily_preview_last_attempt",
                value=(now - timedelta(minutes=5)).isoformat(),
            )
        )
        db.commit()
    finally:
        db.close()

    def unexpected_provider_call(*_args, **_kwargs):
        pytest.fail("provider graph must not run while the scheduler cooldown is active")

    monkeypatch.setattr(scheduler, "execute_content_graph", unexpected_provider_call)
    scheduler.generate_daily_agent_preview()

    db = scheduler_session_factory()
    try:
        assert db.query(models.AgentRun).count() == 0
        assert db.query(models.AiMemoryBrain).count() == 0
    finally:
        db.close()



def test_scheduler_sleeps_only_remaining_cooldown_after_recent_attempt(
    scheduler_session_factory, monkeypatch: pytest.MonkeyPatch
) -> None:
    now = datetime(2026, 10, 12, 4, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(scheduler, "SessionLocal", scheduler_session_factory)
    db = scheduler_session_factory()
    try:
        db.add(
            models.AppSetting(
                key="scheduler_daily_preview_last_attempt",
                value=(now - timedelta(hours=23)).isoformat(),
            )
        )
        db.commit()
    finally:
        db.close()

    delay = scheduler._seconds_until_next_scheduled_preview(24, now=now)
    assert 3599 <= delay <= 3601


def test_scheduler_falls_back_to_full_interval_without_timestamp(
    scheduler_session_factory, monkeypatch: pytest.MonkeyPatch
) -> None:
    now = datetime(2026, 10, 12, 4, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(scheduler, "SessionLocal", scheduler_session_factory)
    assert scheduler._seconds_until_next_scheduled_preview(24, now=now) == 24 * 60 * 60


def test_scheduler_avoids_hot_loop_when_cooldown_has_elapsed(
    scheduler_session_factory, monkeypatch: pytest.MonkeyPatch
) -> None:
    now = datetime(2026, 10, 12, 4, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(scheduler, "SessionLocal", scheduler_session_factory)
    db = scheduler_session_factory()
    try:
        db.add(
            models.AppSetting(
                key="scheduler_daily_preview_last_attempt",
                value=(now - timedelta(hours=25)).isoformat(),
            )
        )
        db.commit()
    finally:
        db.close()

    assert scheduler._seconds_until_next_scheduled_preview(24, now=now) == 60
