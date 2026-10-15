from __future__ import annotations

import os
import time
from typing import Any

import requests


def qstash_configured() -> bool:
    return bool(os.getenv("QSTASH_TOKEN", "").strip() and os.getenv("QSTASH_DESTINATION_URL", "").strip())


def publish_workflow_run(run_id: str, scheduled_for: float) -> str:
    """Publish a workflow trigger to QStash.

    QStash owns delivery, delay, retry, and deduplication. In Render Free mode
    the signed delivery is consumed by the web service itself; Celery remains
    an optional execution path for deployments that explicitly enable it.
    """
    token = os.getenv("QSTASH_TOKEN", "").strip()
    destination = os.getenv("QSTASH_DESTINATION_URL", "").strip().rstrip("/")
    if not token or not destination:
        raise RuntimeError("QSTASH_TOKEN and QSTASH_DESTINATION_URL are required")

    qstash_url = os.getenv("QSTASH_URL", "https://qstash.upstash.io").strip().rstrip("/")
    endpoint = f"{qstash_url}/v2/publish/{destination}/api/admin/workflow/qstash-dispatch"
    body: dict[str, Any] = {"run_id": run_id}
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Upstash-Retries": os.getenv("QSTASH_RETRIES", "3"),
        "Upstash-Timeout": os.getenv("QSTASH_TIMEOUT", "10s"),
        "Upstash-Deduplication-Id": run_id,
        "Upstash-Forward-Content-Type": "application/json",
    }
    not_before = max(int(scheduled_for), int(time.time()))
    headers["Upstash-Not-Before"] = str(not_before)

    response = requests.post(endpoint, json=body, headers=headers, timeout=10)
    response.raise_for_status()
    payload = response.json()
    message_id = str(payload.get("messageId", "")).strip()
    if not message_id:
        raise RuntimeError("QStash did not return a message id")
    return message_id
