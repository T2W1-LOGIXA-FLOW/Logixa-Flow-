from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from threading import Lock, Thread
from time import sleep

import logging
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .analytics import log_analytics_event

from .database import SessionLocal
from .models import AiMemoryBrain, AgentRun, AppSetting, IntelligenceSource
from .agent_graph import execute_content_graph
from .routers.agent import score_source_grounding

_SCHEDULER_LOCK = Lock()
_SCHEDULED_PREVIEW_LAST_ATTEMPT_KEY = "scheduler_daily_preview_last_attempt"


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _claim_scheduled_preview_slot(
    db: Session,
    *,
    interval_hours: int,
    message: str,
    now: datetime | None = None,
) -> bool:
    """Persist a cooldown before provider work so restarts cannot duplicate previews."""
    now_value = now or datetime.now(timezone.utc)
    now = now_value.replace(tzinfo=timezone.utc) if now_value.tzinfo is None else now_value.astimezone(timezone.utc)
    cutoff = now - timedelta(hours=max(interval_hours, 1))
    setting = (
        db.query(AppSetting)
        .filter(AppSetting.key == _SCHEDULED_PREVIEW_LAST_ATTEMPT_KEY)
        .with_for_update()
        .first()
    )

    last_attempt = None
    if setting is not None:
        try:
            last_attempt = _as_utc(datetime.fromisoformat(setting.value))
        except (TypeError, ValueError):
            last_attempt = None

    # Bootstrap the durable cooldown from pre-existing records on the first deploy.
    # This prevents the first restart after deploying the fix from creating another
    # preview immediately after a recent attempt that predates the setting.
    if last_attempt is None or last_attempt < cutoff:
        latest_memory = (
            db.query(AiMemoryBrain)
            .filter(AiMemoryBrain.source_title.like("Daily Preview:%"))
            .order_by(AiMemoryBrain.created_at.desc())
            .first()
        )
        latest_run = (
            db.query(AgentRun)
            .filter(AgentRun.objective == message)
            .order_by(AgentRun.created_at.desc())
            .first()
        )
        recent_records = [
            timestamp
            for timestamp in (
                _as_utc(latest_memory.created_at if latest_memory else None),
                _as_utc(latest_run.created_at if latest_run else None),
            )
            if timestamp is not None and timestamp >= cutoff
        ]
        if recent_records:
            candidates = list(recent_records)
            if last_attempt is not None:
                candidates.append(last_attempt)
            last_attempt = max(candidates)

    if last_attempt is not None and last_attempt >= cutoff:
        if setting is None:
            setting = AppSetting(
                key=_SCHEDULED_PREVIEW_LAST_ATTEMPT_KEY,
                value=last_attempt.isoformat(),
            )
            db.add(setting)
            try:
                db.commit()
            except IntegrityError:
                db.rollback()
        return False

    if setting is None:
        setting = AppSetting(
            key=_SCHEDULED_PREVIEW_LAST_ATTEMPT_KEY,
            value=now.isoformat(),
        )
        db.add(setting)
    else:
        setting.value = now.isoformat()
    try:
        db.commit()
    except IntegrityError:
        # A second instance may have inserted the key concurrently. Re-read the
        # winner's timestamp and skip if its claim is still within the cooldown.
        db.rollback()
        winner = (
            db.query(AppSetting)
            .filter(AppSetting.key == _SCHEDULED_PREVIEW_LAST_ATTEMPT_KEY)
            .first()
        )
        winner_time = None
        if winner is not None:
            try:
                winner_time = _as_utc(datetime.fromisoformat(winner.value))
            except (TypeError, ValueError):
                winner_time = None
        if winner_time is not None and winner_time >= cutoff:
            return False
        raise
    return True


def _run_scheduled_preview(event_name: str) -> int | None:
    db = SessionLocal()
    try:
        message = os.getenv("DAILY_AGENT_PROMPT", "Generate a preview-only Myanmar supply chain daily brief.")
        if event_name == "scheduled_daily_preview":
            interval_hours = max(int(os.getenv("SCHEDULER_INTERVAL_HOURS", "24")), 1)
            if not _claim_scheduled_preview_slot(
                db,
                interval_hours=interval_hours,
                message=message,
            ):
                logging.getLogger(__name__).info(
                    "Skipping scheduled daily preview; a recent attempt is already recorded",
                    extra={"operation": "scheduled_daily_preview", "reason": "cooldown"},
                )
                return None

        sources = db.query(IntelligenceSource).order_by(IntelligenceSource.updated_at.desc()).limit(5).all()
        run = AgentRun(
            objective=message,
            model="pending",
            status="running",
            input_context=json.dumps({"message": message, "source_ids": [source.id for source in sources]}),
            source_ids=json.dumps([source.id for source in sources]),
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        try:
            graph = execute_content_graph(db, run, message, sources)
        except Exception:
            run.status = "failed"
            db.commit()
            raise

        confidence_score, hallucination_score = score_source_grounding(sources)
        fact_check = graph.final.get("fact_check") or {}
        quality_gate = graph.final.get("quality_gate") or {}
        if fact_check.get("verdict") == "fail" or quality_gate.get("verdict") == "fail":
            confidence_score = min(confidence_score, 0.45)
            hallucination_score = max(hallucination_score, 0.55)

        provider = ",".join(dict.fromkeys(graph.providers)) or "local"
        run.model = str(graph.final.get("model") or "local")
        run.provider = provider
        run.token_usage = graph.total_tokens
        try:
            cost_per_1k = Decimal(os.getenv("AI_COST_PER_1K", "0.002"))
        except (InvalidOperation, ValueError):
            cost_per_1k = Decimal("0")
        run.cost_estimate = (Decimal(graph.total_tokens) / Decimal("1000")) * cost_per_1k
        run.status = "completed"
        memory = AiMemoryBrain(
            category=sources[0].category if sources else "Supply Chain",
            source_title=f"Daily Preview: {graph.final.get('title') or 'Supply Chain Signal Brief'}",
            source_url=sources[0].url if sources else None,
            prompt=message,
            content=str(graph.final.get("content_html") or graph.final.get("content") or "<p>Preview requires admin review.</p>"),
            summary=str(graph.final.get("excerpt") or "Private AI-generated draft for admin review.")[:500],
            status="pending",
            is_public=False,
            confidence_score=confidence_score,
            hallucination_score=hallucination_score,
            source_ids=json.dumps([source.id for source in sources]),
            provider=provider,
            token_usage=graph.total_tokens,
            cost_estimate=run.cost_estimate,
        )
        db.add(memory)
        db.commit()
        db.refresh(memory)
        run.final_memory_id = memory.id
        db.commit()
        log_analytics_event(db, event_name, {"run_id": run.id, "memory_id": memory.id, "providers": provider})
        return memory.id
    finally:
        db.close()


def generate_daily_agent_preview() -> None:
    _run_scheduled_preview("scheduled_daily_preview")


def run_daily_agent_preview_once() -> int | None:
    return _run_scheduled_preview("manual_daily_preview")


def scheduler_status() -> dict[str, object]:
    return {
        "enabled": os.getenv("ENABLE_SCHEDULER", "true").lower() == "true",
        "interval_hours": max(int(os.getenv("SCHEDULER_INTERVAL_HOURS", "24")), 1),
    }


def start_scheduler() -> None:
    if os.getenv("ENABLE_SCHEDULER", "true").lower() != "true":
        return
    interval_hours = max(int(os.getenv("SCHEDULER_INTERVAL_HOURS", "24")), 1)

    def loop() -> None:
        logger = logging.getLogger(__name__)
        if not _SCHEDULER_LOCK.acquire(blocking=False):
            logger.warning("Scheduler instance already active; skipping duplicate worker")
            return
        try:
            while True:
                try:
                    generate_daily_agent_preview()
                except Exception:
                    logger.exception(
                        "Scheduled daily preview failed; scheduler will continue",
                        extra={"operation": "scheduled_daily_preview"},
                    )
                sleep(interval_hours * 60 * 60)
        finally:
            _SCHEDULER_LOCK.release()

    Thread(target=loop, name="logixa-scheduler", daemon=True).start()
