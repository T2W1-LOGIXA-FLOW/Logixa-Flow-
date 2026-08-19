from __future__ import annotations

import os
import time
import traceback
from datetime import datetime, timezone

from main_pipeline import run_pipeline


def _bool_env(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _run_once() -> None:
    mode = os.getenv("WORKER_MODE", "web-pipeline").strip().lower()
    started_at = datetime.now(timezone.utc).isoformat()
    print(f"[worker] starting run mode={mode} at={started_at}", flush=True)

    if mode == "web-pipeline":
        run_pipeline(web_pipeline=True)
    elif mode == "sync-web":
        run_pipeline(sync_web=True)
    elif mode == "push-brain":
        run_pipeline(push_brain=True)
    elif mode == "local":
        run_pipeline()
    else:
        raise ValueError(
            "Unsupported WORKER_MODE. Use web-pipeline, sync-web, push-brain, or local."
        )

    finished_at = datetime.now(timezone.utc).isoformat()
    print(f"[worker] finished run mode={mode} at={finished_at}", flush=True)


def main() -> None:
    interval_seconds = max(300, _int_env("WORKER_INTERVAL_SECONDS", 3600))
    run_on_start = _bool_env("WORKER_RUN_ON_START", True)
    run_once = _bool_env("WORKER_ONCE", False)

    print(
        "[worker] booted "
        f"interval_seconds={interval_seconds} "
        f"run_on_start={run_on_start} "
        f"run_once={run_once}",
        flush=True,
    )

    if run_on_start:
        try:
            _run_once()
        except Exception:
            traceback.print_exc()

    if run_once:
        return

    while True:
        time.sleep(interval_seconds)
        try:
            _run_once()
        except Exception:
            traceback.print_exc()


if __name__ == "__main__":
    main()
