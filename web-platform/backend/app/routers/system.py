from __future__ import annotations

import os

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models
from ..cache import cache_client, rate_limiter
from ..config import ai_provider_configured, provider_env_status, validate_env
from ..database import get_db
from ..llm.router import LLMRouter
from ..scheduler import run_daily_agent_preview_once
from ..security import require_admin

router = APIRouter()


@router.get("/admin/system/status")
def system_status(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict[str, object]:
    return {
        "missing_env": validate_env(),
        "scheduler_enabled": os.getenv("ENABLE_SCHEDULER", "false").lower() == "true",
        "ai_key_configured": ai_provider_configured(),
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
