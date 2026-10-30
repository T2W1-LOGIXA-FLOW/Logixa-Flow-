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
from .models import AiMemoryBrain, AgentRun, AppSetting, BrainContext, BrainSynthesis, FeedSource, IntelligenceSource
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


def _seconds_until_next_scheduled_preview(
    interval_hours: int,
    *,
    now: datetime | None = None,
) -> float:
    """Return the remaining cooldown instead of resetting a full sleep on cold start."""
    interval_seconds = max(interval_hours, 1) * 60 * 60
    current = now or datetime.now(timezone.utc)
    current = current.replace(tzinfo=timezone.utc) if current.tzinfo is None else current.astimezone(timezone.utc)
    db = SessionLocal()
    try:
        setting = (
            db.query(AppSetting)
            .filter(AppSetting.key == _SCHEDULED_PREVIEW_LAST_ATTEMPT_KEY)
            .first()
        )
        if setting is None:
            return float(interval_seconds)
        try:
            last_attempt = _as_utc(datetime.fromisoformat(setting.value))
        except (TypeError, ValueError):
            return float(interval_seconds)
        if last_attempt is None:
            return float(interval_seconds)
        elapsed_seconds = (current - last_attempt).total_seconds()
        remaining_seconds = interval_seconds - elapsed_seconds
        # If a previous run failed before its claim could be persisted, avoid a
        # hot retry loop while still checking again sooner than a full interval.
        return max(60.0, min(float(interval_seconds), remaining_seconds))
    finally:
        db.close()


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


# ---------------------------------------------------------------------------
# Brain Layer — Auto RSS Feed Pull
# ---------------------------------------------------------------------------

_FEED_PULL_INTERVAL_HOURS = 6
_FEED_PULL_BATCH = 10


def run_auto_feed_pull() -> dict[str, int]:
    """
    Pull RSS feeds that have not been scraped in the last FEED_PULL_INTERVAL_HOURS.

    Returns a summary dict: {"pulled": n, "skipped": n, "errors": n}.
    """
    from .integration_service import import_rss_feed
    from .rag.ingest import UnindexableRSSContentError, ingest_intelligence_source

    logger = logging.getLogger(__name__)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=_FEED_PULL_INTERVAL_HOURS)
    summary = {"pulled": 0, "skipped": 0, "errors": 0}

    db = SessionLocal()
    try:
        stale_feeds = (
            db.query(FeedSource)
            .filter(
                FeedSource.is_active == True,  # noqa: E712
                (FeedSource.last_scrape_at == None)  # noqa: E711
                | (FeedSource.last_scrape_at < cutoff),
            )
            .order_by(FeedSource.last_scrape_at.asc().nullsfirst())
            .limit(_FEED_PULL_BATCH)
            .all()
        )

        if not stale_feeds:
            logger.info(
                "Auto feed pull: no stale feeds found",
                extra={"operation": "auto_feed_pull"},
            )
            return summary

        for feed in stale_feeds:
            try:
                import_rss_feed(db, feed.url, category=feed.category, trust_level=feed.trust_level)
                feed.last_scrape_at = datetime.now(timezone.utc)
                feed.last_scrape_status = "success"
                feed.scrape_count = (feed.scrape_count or 0) + 1
                summary["pulled"] += 1
                logger.info(
                    "Auto feed pull: success",
                    extra={"operation": "auto_feed_pull", "feed_url": feed.url},
                )
            except Exception as exc:
                feed.last_scrape_at = datetime.now(timezone.utc)
                feed.last_scrape_status = "error"
                summary["errors"] += 1
                logger.warning(
                    "Auto feed pull: failed for %s — %s",
                    feed.url,
                    exc,
                    extra={"operation": "auto_feed_pull", "feed_url": feed.url},
                )

        # Index only sources that have never been indexed. This avoids rebuilding
        # existing vectors on every six-hour feed cycle while allowing newly
        # extracted RSS article bodies to become searchable automatically.
        pending_sources = (
            db.query(IntelligenceSource)
            .filter(IntelligenceSource.indexing_status == "not_indexed")
            .order_by(IntelligenceSource.updated_at.desc())
            .limit(_FEED_PULL_BATCH * 5)
            .all()
        )
        for source in pending_sources:
            try:
                source.indexing_status = "processing"
                source.indexing_error = None
                db.commit()
                chunk_count = ingest_intelligence_source(db, source)
                if chunk_count < 1:
                    raise ValueError("Source contains no indexable content")
                source.indexing_status = "indexed"
                source.indexed_at = datetime.now(timezone.utc)
                source.indexing_error = None
                db.commit()
            except UnindexableRSSContentError as exc:
                db.rollback()
                failed_source = (
                    db.query(IntelligenceSource)
                    .filter(IntelligenceSource.id == source.id)
                    .first()
                )
                if failed_source is not None:
                    failed_source.indexing_status = "failed"
                    failed_source.indexing_error = str(exc)[:1000]
                    db.commit()
                summary["skipped"] += 1
            except Exception as exc:
                db.rollback()
                failed_source = (
                    db.query(IntelligenceSource)
                    .filter(IntelligenceSource.id == source.id)
                    .first()
                )
                if failed_source is not None:
                    failed_source.indexing_status = "failed"
                    failed_source.indexing_error = str(exc)[:1000]
                    db.commit()
                summary["errors"] += 1
                logger.warning(
                    "Auto feed pull: RAG indexing failed for source %s — %s",
                    source.id,
                    exc,
                    extra={"operation": "auto_feed_pull", "source_id": source.id},
                )

        db.commit()
        log_analytics_event(db, "auto_feed_pull", summary)
    except Exception as exc:
        logger.exception(
            "Auto feed pull: unexpected error — %s",
            exc,
            extra={"operation": "auto_feed_pull"},
        )
    finally:
        db.close()

    return summary


# ---------------------------------------------------------------------------
# Brain Layer — Weekly Brain Synthesis
# ---------------------------------------------------------------------------

_SYNTHESIS_MIN_MEMORIES = 3
_SYNTHESIS_MAX_MEMORIES = 40


def run_weekly_brain_synthesis(category: str = "Supply Chain") -> int | None:
    """
    Synthesise approved AiMemoryBrain entries from the past 7 days into a
    single BrainSynthesis snapshot for the given category.

    Returns the new BrainSynthesis.id, or None if skipped / not enough data.
    """
    logger = logging.getLogger(__name__)
    now = datetime.now(timezone.utc)
    period_label = now.strftime("%Y-W%W")
    week_ago = now - timedelta(days=7)

    db = SessionLocal()
    try:
        # Skip if a synthesis for this week + category already exists
        existing = (
            db.query(BrainSynthesis)
            .filter(
                BrainSynthesis.period_label == period_label,
                BrainSynthesis.category == category,
            )
            .first()
        )
        if existing:
            logger.info(
                "Weekly synthesis already exists for %s / %s — skipping",
                period_label,
                category,
                extra={"operation": "weekly_brain_synthesis"},
            )
            return None

        approved_memories = (
            db.query(AiMemoryBrain)
            .filter(
                AiMemoryBrain.status == "approved",
                AiMemoryBrain.category == category,
                AiMemoryBrain.created_at >= week_ago,
            )
            .order_by(AiMemoryBrain.created_at.desc())
            .limit(_SYNTHESIS_MAX_MEMORIES)
            .all()
        )

        if len(approved_memories) < _SYNTHESIS_MIN_MEMORIES:
            logger.info(
                "Weekly synthesis: only %s approved memories for %s — need %s, skipping",
                len(approved_memories),
                category,
                _SYNTHESIS_MIN_MEMORIES,
                extra={"operation": "weekly_brain_synthesis"},
            )
            return None

        # Build a compact summary block for the LLM prompt
        combined_lines = []
        for m in approved_memories:
            snippet = (m.summary or m.content or "")[:300].replace("\n", " ")
            combined_lines.append(f"[{m.category}] {m.source_title}: {snippet}")
        combined = "\n".join(combined_lines)

        synthesis_prompt = (
            f"You are a supply chain intelligence analyst. "
            f"Based on the {len(approved_memories)} intelligence items below "
            f"(category: {category}, period: past 7 days), write a concise synthesis "
            f"(300–500 words) that covers:\n"
            f"1. Key trends observed this week\n"
            f"2. Notable changes or disruptions\n"
            f"3. What to watch in the coming week\n\n"
            f"Intelligence items:\n{combined}\n\n"
            f"Write in clear, professional English. No bullet overload — use short paragraphs."
        )

        # Use LLM router (same pattern as agent router)
        try:
            from .llm.router import LLMRouter
            lm = LLMRouter(db, role="admin")
            synthesis_text, provider = lm.generate_with_provider(synthesis_prompt)
            synthesis_text = synthesis_text.strip()
            token_usage = max(1, (len(synthesis_prompt) + len(synthesis_text)) // 4)
        except Exception as llm_exc:
            logger.warning(
                "Weekly synthesis: LLM call failed — %s; using extractive fallback",
                llm_exc,
                extra={"operation": "weekly_brain_synthesis"},
            )
            # Extractive fallback: concatenate summaries
            synthesis_text = "\n\n".join(
                f"• {m.source_title}: {(m.summary or m.content or '')[:200]}"
                for m in approved_memories[:10]
            )
            provider = "extractive_fallback"
            token_usage = 0

        if not synthesis_text:
            logger.warning(
                "Weekly synthesis: empty result for %s — skipping",
                category,
                extra={"operation": "weekly_brain_synthesis"},
            )
            return None

        synthesis = BrainSynthesis(
            period_label=period_label,
            period_start=week_ago,
            period_end=now,
            category=category,
            synthesis_text=synthesis_text,
            source_memory_ids=json.dumps([m.id for m in approved_memories]),
            memory_count=len(approved_memories),
            provider=provider,
            token_usage=token_usage,
        )
        db.add(synthesis)
        db.commit()
        db.refresh(synthesis)

        log_analytics_event(
            db,
            "weekly_brain_synthesis",
            {
                "synthesis_id": synthesis.id,
                "period_label": period_label,
                "category": category,
                "memory_count": len(approved_memories),
                "provider": provider,
            },
        )
        logger.info(
            "Weekly synthesis created: id=%s period=%s category=%s memories=%s",
            synthesis.id,
            period_label,
            category,
            len(approved_memories),
            extra={"operation": "weekly_brain_synthesis"},
        )
        return synthesis.id

    except Exception as exc:
        logger.exception(
            "Weekly brain synthesis failed — %s",
            exc,
            extra={"operation": "weekly_brain_synthesis"},
        )
        return None
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Scheduler main loop
# ---------------------------------------------------------------------------

def start_scheduler() -> None:
    if os.getenv("ENABLE_SCHEDULER", "true").lower() != "true":
        return
    interval_hours = max(int(os.getenv("SCHEDULER_INTERVAL_HOURS", "24")), 1)
    feed_interval_seconds = _FEED_PULL_INTERVAL_HOURS * 3600
    synthesis_interval_seconds = 7 * 24 * 3600  # weekly

    def loop() -> None:
        logger = logging.getLogger(__name__)
        if not _SCHEDULER_LOCK.acquire(blocking=False):
            logger.warning("Scheduler instance already active; skipping duplicate worker")
            return
        try:
            last_feed_pull: datetime | None = None
            last_synthesis: datetime | None = None

            while True:
                now = datetime.now(timezone.utc)

                # --- Daily agent preview (existing) ---
                try:
                    generate_daily_agent_preview()
                except Exception:
                    logger.exception(
                        "Scheduled daily preview failed; scheduler will continue",
                        extra={"operation": "scheduled_daily_preview"},
                    )

                # --- Auto RSS feed pull (every 6 h) ---
                if last_feed_pull is None or (now - last_feed_pull).total_seconds() >= feed_interval_seconds:
                    try:
                        summary = run_auto_feed_pull()
                        logger.info(
                            "Auto feed pull complete: %s",
                            summary,
                            extra={"operation": "auto_feed_pull"},
                        )
                        last_feed_pull = now
                    except Exception:
                        logger.exception(
                            "Auto feed pull failed; scheduler will continue",
                            extra={"operation": "auto_feed_pull"},
                        )

                # --- Weekly brain synthesis (every 7 days) ---
                if last_synthesis is None or (now - last_synthesis).total_seconds() >= synthesis_interval_seconds:
                    categories = ["Supply Chain", "Logistics", "Procurement", "Operations Excellence"]
                    for cat in categories:
                        try:
                            run_weekly_brain_synthesis(cat)
                        except Exception:
                            logger.exception(
                                "Weekly brain synthesis failed for %s; continuing",
                                cat,
                                extra={"operation": "weekly_brain_synthesis"},
                            )
                    last_synthesis = now

                # Sleep until next daily preview check
                try:
                    delay_seconds = _seconds_until_next_scheduled_preview(interval_hours)
                except Exception:
                    logger.exception(
                        "Could not calculate the next scheduled preview time; falling back to interval",
                        extra={"operation": "scheduled_daily_preview"},
                    )
                    delay_seconds = interval_hours * 60 * 60

                # Wake for the six-hour feed cadence even when the daily-preview
                # cooldown still has many hours remaining.
                feed_remaining = (
                    feed_interval_seconds
                    if last_feed_pull is None
                    else max(60.0, feed_interval_seconds - (now - last_feed_pull).total_seconds())
                )
                synthesis_remaining = (
                    synthesis_interval_seconds
                    if last_synthesis is None
                    else max(60.0, synthesis_interval_seconds - (now - last_synthesis).total_seconds())
                )
                sleep(min(delay_seconds, feed_remaining, synthesis_remaining))
        finally:
            _SCHEDULER_LOCK.release()

    Thread(target=loop, name="logixa-scheduler", daemon=True).start()

