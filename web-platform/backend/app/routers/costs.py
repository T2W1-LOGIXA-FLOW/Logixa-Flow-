from __future__ import annotations

import json
from decimal import Decimal, InvalidOperation
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models
from ..security import require_admin

router = APIRouter()


class CostRecord(BaseModel):
    service: str
    amount: Decimal
    details: Optional[str] = None
    timestamp: Optional[str] = None


@router.post("/admin/costs/record", status_code=status.HTTP_201_CREATED)
def record_cost(payload: CostRecord, db: Session = Depends(get_db), _: dict = Depends(require_admin)) -> dict:
    details = {
        "service": payload.service,
        "amount": str(payload.amount),
        "details": payload.details,
        "timestamp": payload.timestamp,
    }
    evt = models.AnalyticsEvent(event_type="api_cost", details=json.dumps(details))
    db.add(evt)
    db.commit()
    db.refresh(evt)
    return {"ok": True, "id": evt.id}


@router.get("/admin/costs")
def admin_costs_index(
    start: Optional[str] = Query(default=None, description="Start date YYYY-MM-DD"),
    end: Optional[str] = Query(default=None, description="End date YYYY-MM-DD"),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    return costs_summary(start=start, end=end, db=db, _=_)


@router.get("/admin/costs/trend")
def admin_costs_trend(
    start: Optional[str] = Query(default=None, description="Start date YYYY-MM-DD"),
    end: Optional[str] = Query(default=None, description="End date YYYY-MM-DD"),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    summary = costs_summary(start=start, end=end, db=db, _=_)
    return {"trend": summary.get("daily", [])}


@router.get("/admin/costs/summary")
def costs_summary(
    start: Optional[str] = Query(default=None, description="Start date YYYY-MM-DD"),
    end: Optional[str] = Query(default=None, description="End date YYYY-MM-DD"),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    """Aggregate api_cost events into totals by day and by service.

    If start/end are omitted, returns last 30 days.
    """
    q = db.query(models.AnalyticsEvent).filter(models.AnalyticsEvent.event_type == "api_cost").order_by(models.AnalyticsEvent.created_at.asc())
    records = q.all()

    # parse and filter
    rows = []
    for r in records:
        try:
            payload = json.loads(r.details or "{}")
        except Exception:
            payload = {}
        try:
            amount = Decimal(str(payload.get("amount") or "0"))
        except (InvalidOperation, TypeError, ValueError):
            amount = Decimal("0")
        service = payload.get("service") or "unknown"
        # prefer payload timestamp if provided
        ts = None
        if payload.get("timestamp"):
            try:
                ts = datetime.fromisoformat(payload.get("timestamp"))
            except Exception:
                ts = None
        if not ts:
            ts = r.created_at.replace(tzinfo=timezone.utc)
        rows.append({"date": ts.date().isoformat(), "service": service, "amount": amount})

    # apply start/end filters
    if start:
        rows = [row for row in rows if row["date"] >= start]
    if end:
        rows = [row for row in rows if row["date"] <= end]

    # aggregate totals
    total_cost = sum((r["amount"] for r in rows), Decimal("0"))
    by_service = {}
    by_day = {}

    for r in rows:
        by_service[r["service"]] = by_service.get(r["service"], Decimal("0")) + r["amount"]
        day = r["date"]
        by_day.setdefault(day, {"date": day, "total": Decimal("0"), "services": {}})
        by_day[day]["total"] += r["amount"]
        by_day[day]["services"][r["service"]] = by_day[day]["services"].get(r["service"], Decimal("0")) + r["amount"]

    daily = [v for k, v in sorted(by_day.items())]

    return {"total_cost": total_cost, "by_service": by_service, "daily": daily}
