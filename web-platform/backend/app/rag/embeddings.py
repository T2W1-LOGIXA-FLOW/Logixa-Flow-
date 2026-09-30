from __future__ import annotations

import hashlib
import json
import math
import os
from collections import Counter

EMBEDDING_DIMENSIONS = int(os.getenv("EMBEDDING_DIMENSIONS", "768"))


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


def embed_text(text: str) -> tuple[list[float], str]:
    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("EMBEDDING_MODEL", "gemini-embedding-001")
    if api_key:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            response = client.models.embed_content(
                model=model_name,
                contents=text[:12000],
                config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIMENSIONS),
            )
            embeddings = getattr(response, "embeddings", None) or []
            values = getattr(embeddings[0], "values", None) if embeddings else None
            if values:
                # attempt to record a small estimated cost for embeddings
                try:
                    from ..database import SessionLocal
                    from ..analytics import log_analytics_event

                    char_count = len(text)
                    tokens = max(1, int(char_count / 4))
                    cost_per_1k = float(os.getenv("EMBEDDING_COST_PER_1K", "0.0004"))
                    amount = round((tokens / 1000.0) * cost_per_1k, 8)
                    db = SessionLocal()
                    try:
                        log_analytics_event(db, "api_cost", {"service": "gemini_embeddings", "amount": amount, "tokens": tokens, "model": model_name})
                    finally:
                        db.close()
                except Exception:
                    # non-fatal, continue
                    pass
                return [float(value) for value in values], model_name
        except Exception:
            pass
    return _hash_embedding(text), "hash:fallback"


def embedding_to_json(values: list[float]) -> str:
    return json.dumps(values)


def embedding_from_json(payload: str) -> list[float]:
    return [float(value) for value in json.loads(payload)]
