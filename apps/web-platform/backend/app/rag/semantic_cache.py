from __future__ import annotations

import hashlib
import json
import os

from ..cache import cache_client


def _cache_key(query: str) -> str:
    digest = hashlib.sha256(query.strip().lower().encode("utf-8")).hexdigest()
    return f"rag:semantic:{digest}"


def get_cached_answer(query: str) -> dict | None:
    payload = cache_client.get_json(_cache_key(query))
    return payload if isinstance(payload, dict) else None


def set_cached_answer(query: str, answer: dict) -> None:
    ttl = int(os.getenv("SEMANTIC_CACHE_TTL_SECONDS", "3600"))
    cache_client.set_json(_cache_key(query), answer, ttl_seconds=ttl)
