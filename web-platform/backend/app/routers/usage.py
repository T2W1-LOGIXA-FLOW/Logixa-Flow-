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