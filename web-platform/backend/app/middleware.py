from __future__ import annotations

import os

from fastapi import Request
from fastapi.responses import JSONResponse, Response

from .cache import rate_limiter


PUBLIC_PATH_PREFIXES = ("/", "/health", "/api/posts", "/api/metrics", "/api/contacts", "/api/subscribers", "/uploads")


async def security_headers_middleware(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    return response


async def rate_limit_middleware(request: Request, call_next):
    if os.getenv("ENABLE_RATE_LIMIT", "true").lower() != "true":
        return await call_next(request)

    client_host = request.client.host if request.client else "unknown"
    path = request.url.path
    key = f"{client_host}:{path}"
    limit = None

    # Public AI is intentionally much tighter than ordinary API traffic.
    if path in {"/api/chat/public-query", "/api/chat/public"}:
        limit = int(os.getenv("PUBLIC_AI_RATE_LIMIT_REQUESTS", "10"))
    elif path.startswith("/api/admin/rag/ingest"):
        limit = int(os.getenv("RAG_INGEST_RATE_LIMIT_REQUESTS", "10"))
    elif path == "/api/admin/imports":
        limit = int(os.getenv("IMPORT_RATE_LIMIT_REQUESTS", "10"))

    if not rate_limiter.allow(key, limit=limit):
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
