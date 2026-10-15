from __future__ import annotations

import os


def chunk_text(text: str, chunk_size: int | None = None, overlap: int | None = None) -> list[str]:
    size = chunk_size or int(os.getenv("RAG_CHUNK_SIZE", "800"))
    step_overlap = overlap if overlap is not None else int(os.getenv("RAG_CHUNK_OVERLAP", "150"))
    cleaned = " ".join(text.split())
    if not cleaned:
        return []
    if len(cleaned) <= size:
        return [cleaned]
    chunks: list[str] = []
    start = 0
    while start < len(cleaned):
        end = min(start + size, len(cleaned))
        chunks.append(cleaned[start:end])
        if end >= len(cleaned):
            break
        start = max(end - step_overlap, start + 1)
    return chunks
