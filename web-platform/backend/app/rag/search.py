from __future__ import annotations

import logging
import os

from sqlalchemy.orm import Session

from .. import models
from ..config import PII_REDACTION_ENABLED, PROMPT_SANITIZER_LEVEL
from .embeddings import embed_text, embedding_from_json
from .pgvector_store import pgvector_enabled, similarity_search_pgvector
from .semantic_cache import get_cached_answer, set_cached_answer
from .sanitizer import sanitize_for_prompt
from .vector_math import cosine_similarity

logger = logging.getLogger(__name__)


def _sanitize_matches(matches: list[dict]) -> list[dict]:
    sanitized_matches: list[dict] = []
    for match in matches:
        sanitized = dict(match)
        content = str(sanitized.get("content") or "")
        sanitized_content, meta = sanitize_for_prompt(
            content,
            redact_pii_enabled=PII_REDACTION_ENABLED,
            level=PROMPT_SANITIZER_LEVEL,
        )
        sanitized["content"] = sanitized_content
        if meta["pii_counts"] or meta["injection_lines_removed"]:
            logger.info(
                "RAG source sanitized",
                extra={
                    "operation": "rag_sanitize",
                    "source_type": sanitized.get("source_type"),
                    "source_id": sanitized.get("source_id"),
                    "pii_counts": meta["pii_counts"],
                    "injection_lines_removed": meta["injection_lines_removed"],
                    "truncated": meta["truncated"],
                },
            )
        sanitized_matches.append(sanitized)
    return sanitized_matches


def _attach_citations(db: Session, matches: list[dict]) -> list[dict]:
    source_ids = {
        int(match["source_id"])
        for match in matches
        if match.get("source_type") == "intelligence_source" and str(match.get("source_id", "")).isdigit()
    }
    sources = (
        db.query(models.IntelligenceSource).filter(models.IntelligenceSource.id.in_(source_ids)).all()
        if source_ids else []
    )
    by_id = {str(source.id): source for source in sources}
    for match in matches:
        source = by_id.get(str(match.get("source_id")))
        if source:
            match["citation"] = {
                "source_id": source.id,
                "title": source.title,
                "url": source.url,
                "excerpt": (source.content_text or source.notes or match.get("content", ""))[:500],
                "published_or_updated_at": source.updated_at,
                "trust_score": source.trust_score,
                "freshness_score": source.freshness_score,
                "similarity_score": match.get("score", 0),
            }
    return matches


def similarity_search(db: Session, query: str, top_k: int | None = None) -> list[dict]:
    limit = top_k or int(os.getenv("RAG_TOP_K", "6"))
    query_vector, model_name = embed_text(query)

    if pgvector_enabled(db):
        try:
            matches = _attach_citations(
                db,
                similarity_search_pgvector(db, query_vector, top_k=limit, model_name=model_name),
            )
            return _sanitize_matches(matches)
        except Exception as exc:
            logger.warning("pgvector RAG search failed; using JSON fallback: %s", exc, exc_info=True)

    rows = db.query(models.DocumentEmbedding).order_by(models.DocumentEmbedding.created_at.desc()).limit(2000).all()
    scored: list[tuple[float, models.DocumentEmbedding]] = []
    for row in rows:
        vector = embedding_from_json(row.embedding_json)
        score = cosine_similarity(query_vector, vector)
        scored.append((score, row))
    scored.sort(key=lambda item: item[0], reverse=True)
    output: list[dict] = []
    for score, row in scored[:limit]:
        output.append(
            {
                "score": round(score, 4),
                "source_type": row.source_type,
                "source_id": row.source_id,
                "title": row.title,
                "content": row.content[:1200],
                "embedding_model": row.embedding_model or model_name,
            }
        )
    return _sanitize_matches(output)


def build_rag_context(db: Session, query: str, source_ids: list[int] | None = None) -> str:
    cached = get_cached_answer(query)
    if cached and cached.get("context"):
        return str(cached["context"])

    matches = similarity_search(db, query)
    if source_ids:
        allowed = {str(item) for item in source_ids}
        filtered = [item for item in matches if item["source_type"] != "intelligence_source" or item["source_id"] in allowed]
        if filtered:
            matches = filtered

    if not matches:
        context = "No retrieved RAG context available."
        set_cached_answer(query, {"context": context, "matches": []})
        return context

    lines = ["Retrieved grounded context:"]
    for index, match in enumerate(matches, start=1):
        lines.append(
            f"{index}. [{match['source_type']}:{match['source_id']}] "
            f"(score={match['score']}) {match['title']}: {match['content']}"
        )
    context = "\n".join(lines)
    set_cached_answer(query, {"context": context, "matches": matches})
    return context
