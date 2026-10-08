from __future__ import annotations

import json
import hashlib
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session


_INSERT = text(
    "INSERT INTO rag_observability_events "
    "(event_type, operation, payload, fingerprint, created_at) "
    "VALUES (:event_type, :operation, :payload, :fingerprint, :created_at)"
)


def record_event(
    db: Session,
    event_type: str,
    operation: str,
    payload: dict[str, Any] | None = None,
    *,
    fingerprint: str | None = None,
) -> None:
    """Persist bounded RAG telemetry without making provider/runtime state authoritative."""
    body = payload or {}
    db.execute(
        _INSERT,
        {
            "event_type": event_type[:60],
            "operation": operation[:60],
            "payload": json.dumps(body, ensure_ascii=True, default=str),
            "fingerprint": fingerprint,
            "created_at": datetime.now(UTC),
        },
    )


def fingerprint(*parts: object) -> str:
    value = "|".join(str(part) for part in parts)
    return hashlib.sha256(value.encode("utf-8")).hexdigest()
