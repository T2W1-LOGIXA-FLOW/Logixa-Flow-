from __future__ import annotations

import hashlib
import json
import logging
import math
import os
import time
from collections import Counter

import requests

logger = logging.getLogger(__name__)

EMBEDDING_DIMENSIONS = int(os.getenv("EMBEDDING_DIMENSIONS", "768"))
FREE_EMBEDDING_MODEL = "liquid/lfm-2.5-embedding-350m:free"
VOYAGE_EMBEDDING_MODEL = os.getenv("VOYAGE_EMBEDDING_MODEL", "voyage-3-lite")
VOYAGE_EMBEDDING_DIMENSIONS = 512


def _hash_embedding(text: str, dimensions: int | None = None) -> list[float]:
    size = dimensions or EMBEDDING_DIMENSIONS
    buckets = [0.0] * size
    for token, count in Counter(text.lower().split()).items():
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:2], "big") % size
        sign = 1 if digest[2] % 2 == 0 else -1
        buckets[index] += sign * math.log1p(count)
    norm = math.sqrt(sum(value * value for value in buckets)) or 1.0
    return [round(value / norm, 8) for value in buckets]


def _openrouter_key() -> str:
    return (
        os.getenv("OPENROUTER_API_KEY", "").strip()
        or os.getenv("ADMIN_OPENROUTER_API_KEY", "").strip()
        or os.getenv("USER_OPENROUTER_API_KEY", "").strip()
    )


def embed_text(text: str) -> tuple[list[float], str]:
    """Embed with a zero-priced OpenRouter model; never call paid embedding APIs.

    The free Liquid model's documented default vector size is 1,024. We request
    the repository's configured size for compatibility with the existing 768-D
    pgvector column, and verify the returned shape. If the endpoint/key rejects
    that dimension or is unavailable, use the deterministic local hash embedding.
    """
    api_key = _openrouter_key()
    fallback_reason = "missing_openrouter_key"
    if api_key:
        try:
            response = requests.post(
                "https://openrouter.ai/api/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://logixa-flow.onrender.com",
                    "X-Title": "Logixa Flow",
                },
                json={
                    "model": FREE_EMBEDDING_MODEL,
                    "input": (text or "")[:1500],
                    "dimensions": EMBEDDING_DIMENSIONS,
                    "encoding_format": "float",
                },
                timeout=30,
            )
            response.raise_for_status()
            data = response.json().get("data") or []
            values = data[0].get("embedding") if data else None
            if isinstance(values, list) and len(values) == EMBEDDING_DIMENSIONS:
                return [float(value) for value in values], FREE_EMBEDDING_MODEL
            actual_dimensions = len(values) if isinstance(values, list) else 0
            fallback_reason = f"dimension_mismatch:expected={EMBEDDING_DIMENSIONS}:actual={actual_dimensions}"
        except requests.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else "unknown"
            fallback_reason = f"http_error:{status}"
        except requests.RequestException as exc:
            fallback_reason = f"request_error:{exc.__class__.__name__}"
        except (ValueError, TypeError, KeyError, IndexError) as exc:
            fallback_reason = f"invalid_response:{exc.__class__.__name__}"
        except Exception as exc:
            # Never switch to Gemini or another paid embedding API on failure.
            fallback_reason = f"unexpected_error:{exc.__class__.__name__}"
    logger.warning(
        "RAG embedding using deterministic hash fallback; reason=%s configured_dimensions=%s",
        fallback_reason,
        EMBEDDING_DIMENSIONS,
    )
    return _hash_embedding(text), "hash:fallback"


def embed_text_v2(text: str) -> tuple[list[float], str]:
    """Create a versioned 512-D Voyage vector; never silently substitute another model space."""
    api_key = os.getenv("VOYAGE_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("VOYAGE_API_KEY is required for RAG_EMBEDDING_VERSION=2")

    max_attempts = max(1, int(os.getenv("VOYAGE_EMBEDDING_MAX_ATTEMPTS", "3")))
    response = None
    for attempt in range(1, max_attempts + 1):
        try:
            response = requests.post(
                "https://api.voyageai.com/v1/embeddings",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "input": [(text or "")[:8000]],
                    "model": VOYAGE_EMBEDDING_MODEL,
                    "output_dimension": VOYAGE_EMBEDDING_DIMENSIONS,
                },
                timeout=45,
            )
            if response.status_code == 429 or response.status_code >= 500:
                if attempt < max_attempts:
                    retry_after = response.headers.get("Retry-After", "")
                    try:
                        delay = min(5.0, max(0.0, float(retry_after)))
                    except (TypeError, ValueError):
                        delay = 0.5 * attempt
                    logger.warning(
                        "Voyage embedding provider returned a retryable status",
                        extra={
                            "operation": "voyage_embedding",
                            "http_status": response.status_code,
                            "attempt": attempt,
                            "max_attempts": max_attempts,
                            "retry_delay_seconds": delay,
                        },
                    )
                    time.sleep(delay)
                    continue
            response.raise_for_status()
            break
        except (requests.Timeout, requests.ConnectionError) as exc:
            if attempt >= max_attempts:
                raise
            delay = 0.5 * attempt
            logger.warning(
                "Voyage embedding provider request failed transiently",
                extra={
                    "operation": "voyage_embedding",
                    "error_type": exc.__class__.__name__,
                    "attempt": attempt,
                    "max_attempts": max_attempts,
                    "retry_delay_seconds": delay,
                },
            )
            time.sleep(delay)

    if response is None:
        raise RuntimeError("Voyage embedding provider returned no response")
    data = response.json().get("data") or []
    values = data[0].get("embedding") if data else None
    if not isinstance(values, list) or len(values) != VOYAGE_EMBEDDING_DIMENSIONS:
        actual = len(values) if isinstance(values, list) else 0
        raise ValueError(f"Voyage embedding dimension mismatch: expected {VOYAGE_EMBEDDING_DIMENSIONS}, got {actual}")
    return [float(value) for value in values], VOYAGE_EMBEDDING_MODEL


def embedding_to_json(values: list[float]) -> str:
    return json.dumps(values)


def embedding_from_json(payload: str) -> list[float]:
    return [float(value) for value in json.loads(payload)]
