from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from . import models


def recover_stale_agent_runs(
    db: Session,
    *,
    now: datetime | None = None,
    stale_after_hours: int | None = None,
) -> int:
    """Mark interrupted AgentRun records failed after a bounded stale interval.

    Agent execution is synchronous in the request handler. If the process exits
    after the initial running-state commit, no worker remains to finish that row.
    Keep the threshold configurable for deployments and tests.
    """
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    else:
        current = current.astimezone(timezone.utc)

    configured_hours = (
        stale_after_hours
        if stale_after_hours is not None
        else int(os.getenv("AGENT_RUN_STALE_AFTER_HOURS", "24"))
    )
    cutoff = current - timedelta(hours=max(1, configured_hours))
    stale_runs = (
        db.query(models.AgentRun)
        .filter(
            models.AgentRun.status == "running",
            models.AgentRun.updated_at < cutoff,
        )
        .all()
    )
    for run in stale_runs:
        run.status = "failed"
        run.updated_at = current

    if stale_runs:
        db.commit()
    return len(stale_runs)
