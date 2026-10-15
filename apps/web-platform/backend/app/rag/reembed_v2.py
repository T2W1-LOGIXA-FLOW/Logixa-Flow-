"""Backfill versioned Voyage vectors without overwriting the legacy 768-D index.

Run from apps/web-platform/backend:
    VOYAGE_API_KEY=... python -m app.rag.reembed_v2 --dry-run
    VOYAGE_API_KEY=... python -m app.rag.reembed_v2 --batch-size 50

The command is resumable: only rows without a 512-D vector are processed.
"""
from __future__ import annotations

import argparse
import logging
import os
import time

import requests
from sqlalchemy import text

from .embeddings import embedding_to_json
from ..database import SessionLocal

logger = logging.getLogger(__name__)
MODEL = os.getenv("VOYAGE_EMBEDDING_MODEL", "voyage-3-lite")
DIMENSIONS = 512
ENDPOINT = "https://api.voyageai.com/v1/embeddings"


def embed_voyage(text_value: str) -> list[float]:
    key = os.getenv("VOYAGE_API_KEY", "").strip()
    if not key:
        raise RuntimeError("VOYAGE_API_KEY is required; no local/hash substitution is allowed during backfill")
    response = requests.post(
        ENDPOINT,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={"input": [text_value[:8000]], "model": MODEL, "output_dimension": DIMENSIONS},
        timeout=45,
    )
    response.raise_for_status()
    data = response.json().get("data") or []
    vector = data[0].get("embedding") if data else None
    if not isinstance(vector, list) or len(vector) != DIMENSIONS:
        raise RuntimeError(f"Voyage returned an unexpected vector dimension; expected {DIMENSIONS}")
    return [float(value) for value in vector]


def backfill(*, batch_size: int, dry_run: bool) -> dict[str, int]:
    processed = 0
    remaining = 0
    with SessionLocal() as db:
        remaining = int(db.execute(text(
            "SELECT count(*) FROM document_embeddings WHERE embedding_v2_json IS NULL OR embedding_v2_model IS NULL"
        )).scalar_one())
        if dry_run:
            return {"pending": remaining, "processed": 0}
        while True:
            rows = db.execute(text(
                """
                SELECT id, content FROM document_embeddings
                WHERE embedding_v2_json IS NULL OR embedding_v2_model IS NULL
                ORDER BY id
                LIMIT :limit
                """
            ), {"limit": batch_size}).mappings().all()
            if not rows:
                break
            for row in rows:
                vector = embed_voyage(row["content"] or "")
                payload = embedding_to_json(vector)
                db.execute(text(
                    """
                    UPDATE document_embeddings
                    SET embedding_v2_json = :payload,
                        embedding_v2_model = :model,
                        embedding_v2 = CAST(:payload AS vector)
                    WHERE id = :row_id
                    """
                ), {"payload": payload, "model": MODEL, "row_id": row["id"]})
                processed += 1
                if processed % batch_size == 0:
                    db.commit()
                time.sleep(0.05)
            db.commit()
        remaining = int(db.execute(text(
            "SELECT count(*) FROM document_embeddings WHERE embedding_v2_json IS NULL OR embedding_v2_model IS NULL"
        )).scalar_one())
    return {"pending_before": remaining + processed, "processed": processed, "remaining": remaining}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--batch-size", type=int, default=50)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if args.batch_size < 1 or args.batch_size > 500:
        parser.error("--batch-size must be between 1 and 500")
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    result = backfill(batch_size=args.batch_size, dry_run=args.dry_run)
    logger.info("Voyage embedding backfill result: %s", result)
    if result.get("remaining", 0):
        raise SystemExit(2)


if __name__ == "__main__":
    main()
