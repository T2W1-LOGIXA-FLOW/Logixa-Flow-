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
    """
    No-op in request handlers. Seeding of default metrics is performed at startup to avoid
    mutating GET requests. This keeps GET idempotent and safe for health checks/crawlers.
    """
    return


@router.get("/metrics", response_model=list[schemas.DashboardMetricOut])
def list_metrics(db: Session = Depends(get_db)):
    """Return metrics from DB. If no metrics are configured, return a non-mutating
    in-memory default list so that frontend can display sensible defaults without
    writing to the database."""
    metrics = db.query(models.DashboardMetric).order_by(models.DashboardMetric.display_order.asc()).all()
    if not metrics:
        # Return defaults as Pydantic-validated objects without persisting them.
        return [
            schemas.DashboardMetricOut(id=None, key=key, title=title, value=value, display_order=order, updated_at="")
            for key, title, value, order in DEFAULT_METRICS
        ]
    return metrics


@router.get("/admin/metrics", response_model=list[schemas.DashboardMetricOut])
def admin_metrics(db: Session = Depends(get_db), _=Depends(require_admin)):
    return list_metrics(db)


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
