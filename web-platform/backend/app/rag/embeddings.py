from __future__ import annotations

import hashlib
import json
import logging
import math
import os
import threading
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from collections import Counter

import requests

logger = logging.getLogger(__name__)

EMBEDDING_DIMENSIONS = int(os.getenv("EMBEDDING_DIMENSIONS", "768"))
FREE_EMBEDDING_MODEL = "liquid/lfm-2.5-embedding-350m:free"
VOYAGE_EMBEDDING_MODEL = os.getenv("VOYAGE_EMBEDDING_MODEL", "voyage-3-lite")
VOYAGE_EMBEDDING_DIMENSIONS = 512

# The free-trial Voyage tier can be limited to 3 requests per minute. Share
# request pacing across smoke tests and ingestion in this worker process.
_VOYAGE_REQUEST_LOCK = threading.Lock()
_VOYAGE_LAST_REQUEST_AT = 0.0


def _pace_voyage_request() -> None:
    global _VOYAGE_LAST_REQUEST_AT
    interval = max(0.0, float(os.getenv("VOYAGE_EMBEDDING_MIN_INTERVAL_SECONDS", "21")))
    with _VOYAGE_REQUEST_LOCK:
        now = time.monotonic()
        wait = interval - (now - _VOYAGE_LAST_REQUEST_AT)
        if wait > 0:
            time.sleep(wait)
        _VOYAGE_LAST_REQUEST_AT = time.monotonic()


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
    """Create a versioned 512-D vector: 1. Voyage AI -> 2. Cohere embed-v4.0 -> 3. Deterministic hash fallback."""
    api_key = os.getenv("VOYAGE_API_KEY", "").strip()
    if api_key:
        max_attempts = max(1, int(os.getenv("VOYAGE_EMBEDDING_MAX_ATTEMPTS", "3")))
        for attempt in range(1, max_attempts + 1):
            try:
                _pace_voyage_request()
                response = requests.post(
                    "https://api.voyageai.com/v1/embeddings",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "input": [(text or "")[:8000]],
                        "model": VOYAGE_EMBEDDING_MODEL,
                        "output_dimension": VOYAGE_EMBEDDING_DIMENSIONS,
                    },
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json().get("data") or []
                    values = data[0].get("embedding") if data else None
                    if isinstance(values, list) and len(values) == VOYAGE_EMBEDDING_DIMENSIONS:
                        return [float(value) for value in values], VOYAGE_EMBEDDING_MODEL
                elif response.status_code in (429, 500, 502, 503, 504):
                    if attempt < max_attempts:
                        time.sleep(min(15.0, 1.5 ** attempt))
                        continue
                    logger.warning("Voyage embedding exhausted retryable status %s, attempting Cohere fallback", response.status_code)
                    break
                elif response.status_code >= 400:
                    # A permanent client error usually means the request/model/config
                    # is invalid. Do not hide it behind a different provider.
                    response.raise_for_status()
                else:
                    logger.warning("Voyage embedding returned unexpected status %s, attempting Cohere fallback", response.status_code)
                    break
            except requests.HTTPError as exc:
                status = exc.response.status_code if exc.response is not None else None
                if status in (429, 500, 502, 503, 504) and attempt < max_attempts:
                    time.sleep(min(15.0, 1.5 ** attempt))
                    continue
                if status is not None and 400 <= status < 500 and status != 429:
                    raise
                logger.warning("Voyage embedding request failed, attempting Cohere fallback")
                break
            except Exception as exc:
                if attempt >= max_attempts:
                    logger.warning("Voyage embedding request exception: %s, attempting Cohere fallback", type(exc).__name__)
                    break
                time.sleep(1.0 * attempt)

    # 2. Cohere fallback (embed-v4.0 with 512 dimensions)
    cohere_key = os.getenv("COHERE_API_KEY", "").strip()
    if cohere_key:
        try:
            response = requests.post(
                "https://api.cohere.com/v2/embed",
                headers={"Authorization": f"Bearer {cohere_key}", "Content-Type": "application/json"},
                json={
                    "texts": [(text or "")[:4000]],
                    "model": "embed-v4.0",
                    "output_dimension": VOYAGE_EMBEDDING_DIMENSIONS,
                    "input_type": "search_document",
                },
                timeout=30,
            )
            if response.status_code == 200:
                body = response.json()
                embeddings = body.get("embeddings", {}).get("float", [])
                if embeddings and len(embeddings[0]) == VOYAGE_EMBEDDING_DIMENSIONS:
                    return [float(v) for v in embeddings[0]], "cohere:embed-v4.0"
        except Exception as exc:
            logger.warning("Cohere embedding fallback failed: %s", exc)

    # Version 2 vectors are used for semantic retrieval. A hash vector is not
    # semantically compatible with Voyage/Cohere vectors, even when dimensions
    # match, so never persist or search with a synthetic fallback in this path.
    logger.error("No semantic embedding provider succeeded for the 512-D RAG path")
    raise RuntimeError("Semantic embedding unavailable: configure a working VOYAGE_API_KEY or COHERE_API_KEY")


def embedding_to_json(values: list[float]) -> str:
    return json.dumps(values)


def embedding_from_json(payload: str) -> list[float]:
    return [float(value) for value in json.loads(payload)]
