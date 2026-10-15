from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..models import utc_now
from ..security import require_admin

router = APIRouter()


@router.get("/admin/analytics", response_model=list[schemas.AnalyticsDataOut])
def get_admin_analytics(
    days: int = Query(default=7, ge=1, le=30),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> list[schemas.AnalyticsDataOut]:
    today = utc_now().date()
    output: list[schemas.AnalyticsDataOut] = []
    for offset in range(days - 1, -1, -1):
        day = today - timedelta(days=offset)
        start = utc_now().replace(year=day.year, month=day.month, day=day.day, hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        event_query = db.query(models.AnalyticsEvent).filter(
            models.AnalyticsEvent.created_at >= start,
            models.AnalyticsEvent.created_at < end,
        )
        agent_runs = event_query.filter(models.AnalyticsEvent.event_type == "agent_run").count()
        sources_added = event_query.filter(models.AnalyticsEvent.event_type == "source_added").count()
        pending_approvals = db.query(models.AiMemoryBrain).filter(models.AiMemoryBrain.status == "pending").count()
        published_posts = db.query(models.Post).filter(
            models.Post.status == "published",
            func.date(models.Post.published_at) == day.isoformat(),
        ).count()
        output.append(
            schemas.AnalyticsDataOut(
                date=day.isoformat(),
                agent_runs=agent_runs,
                pending_approvals=pending_approvals,
                published_posts=published_posts,
                sources_added=sources_added,
            )
        )
    return output


@router.get("/admin/analytics/stream")
async def stream_admin_analytics(
    request: Request,
    days: int = Query(default=7, ge=1, le=30),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """Stream analytics records to an authenticated admin client."""

    from fastapi.responses import StreamingResponse
    import asyncio
    import json

    async def event_generator():
        while True:
            if await request.is_disconnected():
                break
            # compute analytics for the requested number of days
            today = utc_now().date()
            output: list[dict] = []
            for offset in range(days - 1, -1, -1):
                day = today - timedelta(days=offset)
                start = utc_now().replace(year=day.year, month=day.month, day=day.day, hour=0, minute=0, second=0, microsecond=0)
                end = start + timedelta(days=1)
                event_query = db.query(models.AnalyticsEvent).filter(
                    models.AnalyticsEvent.created_at >= start,
                    models.AnalyticsEvent.created_at < end,
                )
                agent_runs = event_query.filter(models.AnalyticsEvent.event_type == "agent_run").count()
                sources_added = event_query.filter(models.AnalyticsEvent.event_type == "source_added").count()
                pending_approvals = db.query(models.AiMemoryBrain).filter(models.AiMemoryBrain.status == "pending").count()
                published_posts = db.query(models.Post).filter(
                    models.Post.status == "published",
                    func.date(models.Post.published_at) == day.isoformat(),
                ).count()
                output.append(
                    {
                        "date": day.isoformat(),
                        "agent_runs": agent_runs,
                        "pending_approvals": pending_approvals,
                        "published_posts": published_posts,
                        "sources_added": sources_added,
                    }
                )
            payload = json.dumps({"records": output})
            yield f"data: {payload}\n\n"
            await asyncio.sleep(2)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

