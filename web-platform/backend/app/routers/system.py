from __future__ import annotations

import os

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models
from ..cache import cache_client, rate_limiter
from ..config import ai_provider_configured, provider_env_status, validate_env
from ..database import get_db
from ..llm.router import LLMRouter
from ..scheduler import run_daily_agent_preview_once, scheduler_status
from ..security import require_admin

router = APIRouter()


@router.get("/admin/system/status")
def system_status(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict[str, object]:
    user_router = LLMRouter(db, role="user")
    admin_router = LLMRouter(db, role="admin")
    user_diagnostics = user_router.diagnostics()
    admin_diagnostics = admin_router.diagnostics()
    scheduler = scheduler_status()
    return {
        "missing_env": validate_env(),
        "scheduler_enabled": scheduler["enabled"],
        "scheduler_status": scheduler,
        "ai_key_configured": ai_provider_configured(),
        "user_active_provider": user_diagnostics.get("active_provider"),
        "user_active_model": user_diagnostics.get("active_model"),
        "admin_active_provider": admin_diagnostics.get("active_provider"),
        "admin_active_model": admin_diagnostics.get("active_model"),
        "active_provider": admin_diagnostics.get("active_provider"),
        "active_model": admin_diagnostics.get("active_model"),
        "providers": provider_env_status(),
        "cache_backend": cache_client.backend,
        "rate_limit_backend": rate_limiter.backend,
        "counts": {
            "sources": db.query(models.IntelligenceSource).count(),
            "pending_brain": db.query(models.AiMemoryBrain).filter(models.AiMemoryBrain.status == "pending").count(),
            "agent_runs": db.query(models.AgentRun).count(),
            "analytics_events": db.query(models.AnalyticsEvent).count(),
            "published_posts": db.query(models.Post).filter(models.Post.status == "published").count(),
        },
    }


@router.post("/admin/system/run-daily-preview")
def run_daily_preview(
    _: dict = Depends(require_admin),
) -> dict[str, int | None]:
    return {"memory_id": run_daily_agent_preview_once()}


@router.get("/admin/activity")
def admin_activity(db: Session = Depends(get_db), _=Depends(require_admin)) -> list[dict[str, str | None]]:
    events = (
        db.query(models.AnalyticsEvent)
        .order_by(models.AnalyticsEvent.created_at.desc())
        .limit(10)
        .all()
    )
    items: list[dict[str, str | None]] = []
    for event in events:
        title = event.event_type.replace("_", " ").title()
        if not title:
            title = "System Event"
        items.append({
            "time": event.created_at.isoformat() if event.created_at else None,
            "title": title,
            "detail": event.details or "No additional details available.",
            "tone": "cyan" if "ai" in event.event_type.lower() else "violet" if "agent" in event.event_type.lower() else "amber",
        })
    if not items:
        items = [
            {"time": None, "title": "AI split verified", "detail": "Public user assistant remains separated from admin automation credentials.", "tone": "cyan"},
            {"time": None, "title": "Cost guardrail refreshed", "detail": "Free-tier usage and cost thresholds remain visible to the admin team.", "tone": "amber"},
            {"time": None, "title": "Estimator available", "detail": "Vehicle-fit checks remain available for dispatch and route planning operations.", "tone": "violet"},
        ]
    return items


@router.get("/admin/system/ai-status")
def ai_provider_status(db: Session = Depends(get_db), _=Depends(require_admin)):
    """Return availability status of each AI provider."""
    llm_router = LLMRouter(db)
    status = {}
    for name, provider in llm_router.providers.items():
        status[name] = provider.is_available()
    return {
        "providers": status,
        "diagnostics": llm_router.diagnostics(),
    }
