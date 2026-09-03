from __future__ import annotations

import json
import logging
import os
from datetime import UTC, datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any


class JsonLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        for key in (
            "request_id",
            "path",
            "method",
            "status_code",
            "duration_ms",
            "correlation_id",
            "operation",
            "error_type",
            "attempt",
            "retryable",
            "error_count",
            "alert_threshold",
            "alert_triggered",
        ):
            if hasattr(record, key):
                payload[key] = getattr(record, key)
        return json.dumps(payload, ensure_ascii=False)


def setup_logging() -> None:
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(level)

    console = logging.StreamHandler()
    if os.getenv("STRUCTURED_LOGS", "true").lower() == "true":
        console.setFormatter(JsonLogFormatter())
    else:
        console.setFormatter(logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s"))
    root.addHandler(console)

    log_dir = Path(os.getenv("LOG_DIR", Path(__file__).resolve().parents[1] / "logs"))
    log_dir.mkdir(parents=True, exist_ok=True)
    file_handler = RotatingFileHandler(
        log_dir / "logixa-flow.log",
        maxBytes=int(os.getenv("LOG_MAX_BYTES", str(2 * 1024 * 1024))),
        backupCount=int(os.getenv("LOG_BACKUP_COUNT", "5")),
        encoding="utf-8",
    )
    file_handler.setFormatter(JsonLogFormatter())
    file_handler.setLevel(level)
    root.addHandler(file_handler)

    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_recent_log_lines(limit: int = 80) -> list[str]:
    log_file = Path(os.getenv("LOG_DIR", Path(__file__).resolve().parents[1] / "logs")) / "logixa-flow.log"
    if not log_file.exists():
        return []
    lines = log_file.read_text(encoding="utf-8", errors="replace").splitlines()
    return lines[-limit:]
