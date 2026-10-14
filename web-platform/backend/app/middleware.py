from __future__ import annotations

import logging
import os
import time
import uuid

from fastapi import Request
from fastapi.responses import JSONResponse, Response

from .cache import rate_limiter

logger = logging.getLogger(__name__)


async def request_observability_middleware(request: Request, call_next):
    """Emit one structured, privacy-conscious log record for each HTTP request."""
    request_id = str(uuid.uuid4())
    started_at = time.perf_counter()
    try:
        response: Response = await call_next(request)
    except Exception as exc:
        duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
        logger.exception(
            "HTTP request failed",
            extra={
                "request_id": request_id,
                "path": request.url.path,
                "method": request.method,
                "status_code": 500,
                "duration_ms": duration_ms,
                "error_type": type(exc).__name__,
            },
        )
        raise

    duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
    status_code = response.status_code
    log_level = logging.ERROR if status_code >= 500 else logging.WARNING if status_code >= 400 else logging.INFO
    logger.log(
        log_level,
        "HTTP request completed",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
            "status_code": status_code,
            "duration_ms": duration_ms,
        },
    )
    response.headers["X-Request-ID"] = request_id
    return response


PUBLIC_PATH_PREFIXES = ("/health", "/api/posts", "/api/metrics", "/api/contacts", "/api/subscribers", "/api/uploads/files/", "/uploads")


async def security_headers_middleware(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    return response


async def rate_limit_middleware(request: Request, call_next):
    if os.getenv("USE_SLOWAPI", "true").lower() == "true":
        return await call_next(request)
    if os.getenv("ENABLE_RATE_LIMIT", "true").lower() != "true":
        return await call_next(request)
    client_host = request.client.host if request.client else "unknown"
    key = f"{client_host}:{request.url.path}"
    if not rate_limiter.allow(key):
        return JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
    return await call_next(request)


async def stealth_mode_middleware(request: Request, call_next):
    if os.getenv("PUBLIC_ACCESS", "true").lower() == "true":
        return await call_next(request)
    path = request.url.path
    if path.startswith("/api/admin") or path.startswith("/api/agent") or any(path.startswith(prefix) for prefix in PUBLIC_PATH_PREFIXES):
        return await call_next(request)
    if request.headers.get("X-Preview-Token") and request.headers.get("X-Preview-Token") == os.getenv("PREVIEW_TOKEN"):
        return await call_next(request)
    return JSONResponse({"detail": "Preview access required"}, status_code=403)
