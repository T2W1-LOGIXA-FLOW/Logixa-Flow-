from __future__ import annotations

import json
import os
import time
from collections import defaultdict, deque
from typing import Any


class CacheClient:
    def __init__(self) -> None:
        self._memory: dict[str, tuple[float, str]] = {}
        self._redis = None
        redis_url = os.getenv("REDIS_URL")
        if redis_url:
            try:
                import redis  # type: ignore

                self._redis = redis.Redis.from_url(redis_url, decode_responses=True, socket_timeout=2)
                self._redis.ping()
            except Exception:
                self._redis = None

    @property
    def backend(self) -> str:
        return "redis" if self._redis else "memory"

    def get(self, key: str) -> str | None:
        if self._redis:
            return self._redis.get(key)
        record = self._memory.get(key)
        if not record:
            return None
        expires_at, value = record
        if expires_at < time.time():
            self._memory.pop(key, None)
            return None
        return value

    def set(self, key: str, value: str, ttl_seconds: int = 60) -> None:
        if self._redis:
            self._redis.setex(key, ttl_seconds, value)
            return
        self._memory[key] = (time.time() + ttl_seconds, value)

    def get_json(self, key: str) -> Any | None:
        raw = self.get(key)
        return json.loads(raw) if raw else None

    def set_json(self, key: str, value: Any, ttl_seconds: int = 900) -> None:
        self.set(key, json.dumps(value, ensure_ascii=True), ttl_seconds=ttl_seconds)

    def delete(self, key: str) -> None:
        if self._redis:
            self._redis.delete(key)
            return
        self._memory.pop(key, None)

    def delete_prefix(self, prefix: str) -> int:
        removed = 0
        if self._redis:
            for key in self._redis.scan_iter(match=f"{prefix}*"):
                self._redis.delete(key)
                removed += 1
            return removed
        for key in list(self._memory.keys()):
            if key.startswith(prefix):
                self._memory.pop(key, None)
                removed += 1
        return removed


class RateLimiter:
    def __init__(self) -> None:
        self.limit = int(os.getenv("RATE_LIMIT_REQUESTS", "60"))
        self.window_seconds = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._redis = None
        redis_url = os.getenv("REDIS_URL")
        if redis_url:
            try:
                import redis  # type: ignore

                self._redis = redis.Redis.from_url(redis_url, decode_responses=True, socket_timeout=2)
                self._redis.ping()
            except Exception:
                self._redis = None

    @property
    def backend(self) -> str:
        return "redis" if self._redis else "memory"

    def allow(
        self,
        key: str,
        *,
        limit: int | None = None,
        window_seconds: int | None = None,
    ) -> bool:
        effective_limit = self.limit if limit is None else max(1, int(limit))
        effective_window = self.window_seconds if window_seconds is None else max(1, int(window_seconds))

        if self._redis:
            redis_key = f"rl:{key}:{effective_limit}:{effective_window}"
            count = self._redis.incr(redis_key)
            if count == 1:
                self._redis.expire(redis_key, effective_window)
            return int(count) <= effective_limit

        now = time.time()
        memory_key = f"{key}:{effective_limit}:{effective_window}"
        hits = self._hits[memory_key]
        while hits and hits[0] <= now - effective_window:
            hits.popleft()
        if len(hits) >= effective_limit:
            return False
        hits.append(now)
        return True


cache_client = CacheClient()
rate_limiter = RateLimiter()
