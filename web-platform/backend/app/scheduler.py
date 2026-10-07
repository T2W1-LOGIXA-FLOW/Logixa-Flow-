from __future__ import annotations

import json
import os
from decimal import Decimal, InvalidOperation
from threading import Lock, Thread
from time import sleep

import logging

from .analytics import log_analytics_event
from .database import SessionLocal
from .models import AiMemoryBrain, AgentRun, IntelligenceSource
from .agent_graph import execute_content_graph
from .routers.agent import score_source_grounding

_SCHEDULER_LOCK = Lock()


def _run_scheduled_preview(event_name: str) -> int | None:
    db = SessionLocal()
    try:
        sources = db.query(IntelligenceSource).order_by(IntelligenceSource.updated_at.desc()).limit(5).all()
        message = os.getenv("DAILY_AGENT_PROMPT", "Generate a preview-only Myanmar supply chain daily brief.")
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
