"""
Example router: admin environment status

This endpoint reports presence/health of configured environment variables and
lightweight provider checks. Do NOT return secret values.
"""
import os
from typing import Dict

from fastapi import APIRouter, Depends

from app.security import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin", "system"])


@router.get("/env-status")
async def env_status(_admin=Depends(require_admin)) -> Dict:
    """Return presence flags for required environment variables and optional
    provider health indicators. Values are booleans/strings indicating status
    only; secrets are never returned.
    """
    keys = ["JWT_SECRET", "DATABASE_URL", "STRIPE_API_KEY", "OPENAI_API_KEY"]
    status = {k: bool(os.environ.get(k)) for k in keys}

    # Optional: perform short, cached provider health checks here with timeouts
    # e.g. status["stripe_ok"] = check_stripe_health()

    return {"env": status}
