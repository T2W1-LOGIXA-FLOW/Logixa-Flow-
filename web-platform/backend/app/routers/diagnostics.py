from __future__ import annotations

import os

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from .. import models
from ..cache import cache_client, rate_limiter
from ..config import validate_env
from ..database import engine, get_db
from ..db_bootstrap import database_profile
from ..logging_config import get_recent_log_lines
from ..scheduler import scheduler_status
from ..security import require_admin

router = APIRouter()


@router.get("/admin/diagnostics")
def admin_diagnostics(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    db_ok = True
    db_error = ""
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        db_ok = False
        db_error = exc.__class__.__name__

    scheduler = scheduler_status()
    return {
        "environment": {
            "missing_env": validate_env(),
            "database_profile": database_profile(),
            "ai_key_configured": bool(os.getenv("GEMINI_API_KEY")),
            "scheduler": scheduler,
            "cache_backend": cache_client.backend,
            "rate_limit_backend": rate_limiter.backend,
            "use_slowapi": os.getenv("USE_SLOWAPI", "true").lower() == "true",
        },
        "database": {
            "status": "ok" if db_ok else "error",
            "error": db_error or None,
            "dialect": engine.dialect.name,
        },
        "counts": {
            "sources": db.query(models.IntelligenceSource).count(),
            "pending_brain": db.query(models.AiMemoryBrain).filter(models.AiMemoryBrain.status == "pending").count(),
            "embeddings": db.query(models.DocumentEmbedding).count(),
            "published_posts": db.query(models.Post).filter(models.Post.status == "published").count(),
        },
        "recent_logs": get_recent_log_lines(60),
    }
