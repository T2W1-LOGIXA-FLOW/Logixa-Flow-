from __future__ import annotations

import os

from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "").strip()
if not REDIS_URL:
    raise RuntimeError("REDIS_URL is required when Celery is enabled")

celery_app = Celery(
    "logixa_flow",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

celery_app.conf.update(
    task_default_queue=os.getenv("CELERY_QUEUE", "logixa-workflows"),
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_track_started=True,
    broker_connection_retry_on_startup=True,
    result_expires=86400,
)

celery_app.autodiscover_tasks(["app.workers"])
