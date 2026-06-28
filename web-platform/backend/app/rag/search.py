from __future__ import annotations

import os

from sqlalchemy.orm import Session

from .. import models
from .embeddings import embed_text, embedding_from_json
from .pgvector_store import pgvector_enabled, similarity_search_pgvector
from .semantic_cache import get_cached_answer, set_cached_answer
from .vector_math import cosine_similarity


def similarity_search(db: Session, query: str, top_k: int | None = None) -> list[dict]:
    limit = top_k or int(os.getenv("RAG_TOP_K", "6"))
    query_vector, model_name = embed_text(query)

    if pgvector_enabled(db):
        try:
            return similarity_search_pgvector(db, query_vector, top_k=limit, model_name=model_name)
        except Exception:
            pass

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
    return output


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
