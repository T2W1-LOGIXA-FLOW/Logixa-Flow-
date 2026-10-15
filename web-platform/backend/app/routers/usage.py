from __future__ import annotations

from decimal import Decimal
from datetime import timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models
from ..security import require_admin

router = APIRouter()


@router.get("/admin/usage")
def admin_usage(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    """Aggregated usage by provider and API key name."""
    q = db.query(models.ApiUsageLog).order_by(models.ApiUsageLog.created_at.asc())
    rows = q.all()

    agg: dict = {}
    for r in rows:
        key = (r.provider or "unknown", r.api_key_name or "unknown")
        entry = agg.get(key, {"provider": key[0], "api_key_name": key[1], "tokens": 0, "cost": Decimal("0"), "calls": 0})
        entry["tokens"] += int(r.tokens_used or 0)
        entry["cost"] += r.cost or Decimal("0")
        entry["calls"] += 1
        agg[key] = entry

    result = list(agg.values())
    # sort by cost desc
    result.sort(key=lambda x: x.get("cost", Decimal("0")), reverse=True)
    return {"usage_by_key": result}


@router.get("/admin/usage/trend")
def admin_usage_trend(
    start: Optional[str] = Query(default=None, description="Start date YYYY-MM-DD"),
    end: Optional[str] = Query(default=None, description="End date YYYY-MM-DD"),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    """Return daily aggregated usage for graphing."""
    q = db.query(models.ApiUsageLog).order_by(models.ApiUsageLog.created_at.asc())
    rows = q.all()

    daily: dict = {}
    for r in rows:
        if not r.created_at:
            continue
        day = r.created_at.astimezone(timezone.utc).date().isoformat()
        entry = daily.get(day, {"date": day, "tokens": 0, "cost": Decimal("0"), "calls": 0})
        entry["tokens"] += int(r.tokens_used or 0)
        entry["cost"] += float(r.cost or 0.0)
        entry["calls"] += 1
        daily[day] = entry

    items = [v for k, v in sorted(daily.items())]
    # apply optional start/end filters
    if start:
        items = [it for it in items if it["date"] >= start]
    if end:
        items = [it for it in items if it["date"] <= end]
    return {"daily": items}


@router.get("/ai/usage")
def ai_usage_summary() -> dict:
    """Consolidated endpoint for AI key usage, status, and active provider chains."""
    from ..services.ai_usage_tracker import get_ai_usage_summary
    return get_ai_usage_summary("Logixa-Flow")


@router.get("/admin/usage/brain-dashboard")
def admin_brain_dashboard(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    """Combined brain status and AI usage dashboard for admins."""
    from datetime import datetime, date
    from ..services.ai_usage_tracker import get_ai_usage_summary

    # --- AI usage summary ---
    ai_usage = get_ai_usage_summary("Logixa-Flow")

    # --- BrainContext: soul file entries ---
    soul_count: int = db.query(models.BrainContext).count()

    # --- BrainSynthesis stats ---
    total_syntheses: int = db.query(models.BrainSynthesis).count()

    latest_synthesis = (
        db.query(models.BrainSynthesis)
        .order_by(models.BrainSynthesis.created_at.desc())
        .first()
    )
    latest_synthesis_period: Optional[str] = None
    latest_synthesis_at: Optional[str] = None
    latest_synthesis_snippet: Optional[str] = None
    if latest_synthesis:
        latest_synthesis_period = getattr(latest_synthesis, "period", None)
        if latest_synthesis.created_at:
            latest_synthesis_at = latest_synthesis.created_at.astimezone(timezone.utc).isoformat()
        raw_text = getattr(latest_synthesis, "synthesis_text", None) or ""
        latest_synthesis_snippet = raw_text[:300] if raw_text else None

    # --- AiMemoryBrain: approved memories ---
    approved_memories: int = (
        db.query(models.AiMemoryBrain)
        .filter(models.AiMemoryBrain.approved == True)  # noqa: E712
        .count()
    )

    # --- Today's synthesis token usage ---
    today_midnight = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
    synthesis_tokens_today: int = (
        db.query(models.BrainSynthesis)
        .filter(models.BrainSynthesis.created_at >= today_midnight)
        .with_entities(models.BrainSynthesis.token_usage)
        .all()
    )
    synthesis_tokens_today = sum(
        int(row.token_usage or 0) for row in synthesis_tokens_today
    )

    # --- Feed last pulled at ---
    feed_ctx = (
        db.query(models.BrainContext)
        .filter(models.BrainContext.context_key == "last_feed_pull_at")
        .first()
    )
    feed_last_pulled_at: Optional[str] = (
        getattr(feed_ctx, "context_value", None) if feed_ctx else None
    )

    return {
        "project": "Logixa-Flow",
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        "ai_usage": ai_usage,
        "brain": {
            "soul_file_entries": soul_count,
            "total_syntheses": total_syntheses,
            "latest_synthesis_period": latest_synthesis_period,
            "latest_synthesis_at": latest_synthesis_at,
            "latest_synthesis_snippet": latest_synthesis_snippet,
            "approved_memories": approved_memories,
            "synthesis_tokens_today": synthesis_tokens_today,
            "feed_last_pulled_at": feed_last_pulled_at,
        },
    }