from __future__ import annotations

import hashlib
import json
import math
import os
from collections import Counter

import requests

EMBEDDING_DIMENSIONS = int(os.getenv("EMBEDDING_DIMENSIONS", "768"))
FREE_EMBEDDING_MODEL = "liquid/lfm-2.5-embedding-350m:free"


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
        except Exception:
            # Never switch to Gemini or another paid embedding API on failure.
            pass
    return _hash_embedding(text), "hash:fallback"


def embedding_to_json(values: list[float]) -> str:
    return json.dumps(values)


def embedding_from_json(payload: str) -> list[float]:
    return [float(value) for value in json.loads(payload)]
