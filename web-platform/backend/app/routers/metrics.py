from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import require_admin

router = APIRouter()

DEFAULT_METRICS = [
    ("disruption-risk", "Supply Chain Disruption Risk", "Low", 1),
    ("market-demand", "Market Demand Shifts", "+12%", 2),
    ("port-congestion", "Logistics & Port Congestion", "2.1d", 3),
    ("inventory-cover", "Inventory Cover Projections", "38d", 4),
]


def ensure_default_metrics(db: Session) -> None:
    for key, title, value, order in DEFAULT_METRICS:
        exists = db.query(models.DashboardMetric).filter(models.DashboardMetric.key == key).first()
        if not exists:
            db.add(models.DashboardMetric(key=key, title=title, value=value, display_order=order))
    db.commit()


@router.get("/metrics", response_model=list[schemas.DashboardMetricOut])
def list_metrics(db: Session = Depends(get_db)):
    ensure_default_metrics(db)
    return db.query(models.DashboardMetric).order_by(models.DashboardMetric.display_order.asc()).all()


@router.patch("/metrics/{metric_key}", response_model=schemas.DashboardMetricOut)
def update_metric(
    metric_key: str,
    payload: schemas.DashboardMetricUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    ensure_default_metrics(db)
    metric = db.query(models.DashboardMetric).filter(models.DashboardMetric.key == metric_key).first()
    if not metric:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Metric not found")
    metric.title = payload.title
    metric.value = payload.value
    db.commit()
    db.refresh(metric)
    return metric
