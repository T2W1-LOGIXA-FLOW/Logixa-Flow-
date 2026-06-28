from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from . import models


def log_analytics_event(db: Session, event_type: str, details: dict[str, Any] | None = None) -> None:
    db.add(models.AnalyticsEvent(event_type=event_type, details=json.dumps(details or {}, ensure_ascii=True)))
    db.commit()
