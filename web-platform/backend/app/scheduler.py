from __future__ import annotations

import asyncio
import os
from threading import Lock, Thread
from time import sleep

import logging

from .analytics import log_analytics_event
from .database import SessionLocal
from .models import AiMemoryBrain, IntelligenceSource
from .routers.agent import generate_agent_brief, score_source_grounding

_SCHEDULER_LOCK = Lock()


def generate_daily_agent_preview() -> None:
    db = SessionLocal()
    try:
        logger = logging.getLogger(__name__)
        if os.getenv("GEMINI_API_KEY"):
            logger.info("GEMINI_API_KEY detected: using Gemini for daily previews when available")
        sources = db.query(IntelligenceSource).order_by(IntelligenceSource.updated_at.desc()).limit(5).all()
        message = os.getenv("DAILY_AGENT_PROMPT", "Generate a preview-only Myanmar supply chain daily brief.")
        brief = asyncio.run(generate_agent_brief(message, sources, db=db))
        confidence_score, hallucination_score = score_source_grounding(sources)
        memory = AiMemoryBrain(
            category=brief["category"],
            source_title=f"Daily Preview: {brief['title']}",
            source_url=sources[0].url if sources else None,
            prompt=message,
            content=brief["content"],
            summary=brief["excerpt"],
            status="pending",
            is_public=False,
            confidence_score=confidence_score,
            hallucination_score=hallucination_score,
        )
        db.add(memory)
        db.commit()
        log_analytics_event(db, "scheduled_daily_preview", {"memory_id": memory.id})
    finally:
        db.close()


def run_daily_agent_preview_once() -> int | None:
    db = SessionLocal()
    try:
        sources = db.query(IntelligenceSource).order_by(IntelligenceSource.updated_at.desc()).limit(5).all()
        message = os.getenv("DAILY_AGENT_PROMPT", "Generate a preview-only Myanmar supply chain daily brief.")
        brief = asyncio.run(generate_agent_brief(message, sources, db=db))
        confidence_score, hallucination_score = score_source_grounding(sources)
        memory = AiMemoryBrain(
            category=brief["category"],
            source_title=f"Manual Daily Preview: {brief['title']}",
            source_url=sources[0].url if sources else None,
            prompt=message,
            content=brief["content"],
            summary=brief["excerpt"],
            status="pending",
            is_public=False,
            confidence_score=confidence_score,
            hallucination_score=hallucination_score,
        )
        db.add(memory)
        db.commit()
        db.refresh(memory)
        log_analytics_event(db, "manual_daily_preview", {"memory_id": memory.id})
        return memory.id
    finally:
        db.close()


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
