from __future__ import annotations

import csv
import hashlib
import io
import json
import re
from datetime import UTC, datetime
from html import unescape
from pathlib import PurePosixPath

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..rag.ingest import ingest_intelligence_source
from ..security import require_admin

router = APIRouter()


CONTENT_CATEGORIES = {
    "News", "Research", "Analysis", "Tutorial", "Case Study",
    "Opinion", "Documentation", "Announcement", "Other",
}
SOURCE_CATEGORIES = {
    "Supply Chain", "Logistics", "Ports", "Trade", "Business",
    "Technology", "Regulation", "Environment", "Other",
}
SOURCE_TYPES = {"manual", "file", "url", "rss"}
KNOWLEDGE_STATUSES = {"new", "processing", "needs_review", "approved", "rejected", "archived"}
PUBLICATION_STATUSES = {"draft", "in_review", "scheduled", "published", "unpublished"}
MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_ITEMS = 200


def _clean_html(value: str) -> str:
    value = re.sub(r"<script[^>]*>.*?</script>", " ", value, flags=re.I | re.S)
    value = re.sub(r"<style[^>]*>.*?</style>", " ", value, flags=re.I | re.S)
    value = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", unescape(value)).strip()


def _normalize_record(raw: dict, index: int) -> dict:
    title = str(raw.get("title") or raw.get("name") or "").strip()
    content = str(
        raw.get("content")
        or raw.get("content_text")
        or raw.get("body")
        or raw.get("description")
        or raw.get("text")
        or ""
    ).strip()
    if not title:
        raise ValueError(f"item {index}: title is required")
    if len(title) > 255:
        raise ValueError(f"item {index}: title exceeds 255 characters")
    if len(content) < 10:
        raise ValueError(f"item {index}: content must contain at least 10 characters")
    category = str(raw.get("category") or "Other").strip()
    if category not in CONTENT_CATEGORIES:
        category = "Other"
    source_category = str(raw.get("source_category") or raw.get("topic") or "Other").strip()
    if source_category not in SOURCE_CATEGORIES:
        source_category = "Other"
    url = str(raw.get("url") or raw.get("source_url") or "").strip() or None
    return {
        "title": title,
        "content": content,
        "category": category,
        "source_category": source_category,
        "url": url,
        "notes": str(raw.get("notes") or "").strip()[:8000],
    }


def _parse_file(filename: str, payload: bytes) -> list[dict]:
    if len(payload) > MAX_FILE_BYTES:
        raise ValueError(f"file exceeds {MAX_FILE_BYTES // (1024 * 1024)} MB limit")
    suffix = PurePosixPath(filename).suffix.lower()
    text = payload.decode("utf-8-sig")
    if suffix == ".json":
        data = json.loads(text)
        if isinstance(data, dict):
            data = data.get("records", [data])
        if not isinstance(data, list):
            raise ValueError("JSON must contain an object or an array of records")
        if len(data) > MAX_ITEMS:
            raise ValueError(f"maximum {MAX_ITEMS} records per import")
        return [_normalize_record(item, i + 1) for i, item in enumerate(data) if isinstance(item, dict)]
    if suffix == ".csv":
        reader = csv.DictReader(io.StringIO(text))
        rows = list(reader)
        if not reader.fieldnames:
            raise ValueError("CSV header row is required")
        if len(rows) > MAX_ITEMS:
            raise ValueError(f"maximum {MAX_ITEMS} records per import")
        return [_normalize_record(item, i + 1) for i, item in enumerate(rows)]
    if suffix in {".md", ".markdown", ".txt", ".html", ".htm"}:
        content = _clean_html(text) if suffix in {".html", ".htm"} else text.strip()
        title = next((line.lstrip("# ").strip() for line in content.splitlines() if line.strip()), PurePosixPath(filename).stem)
        return [_normalize_record({"title": title[:255], "content": content}, 1)]
    raise ValueError("unsupported file type; use JSON, CSV, Markdown, TXT, or HTML")


def _source_payload(source: models.IntelligenceSource) -> dict:
    return {
        "id": source.id,
        "title": source.title,
        "url": source.url,
        "source_type": source.source_type,
        "category": source.category,
        "trust_level": source.trust_level,
        "trust_score": source.trust_score,
        "knowledge_status": source.knowledge_status,
        "publication_status": source.publication_status,
        "source_version": source.source_version,
        "indexing_status": source.indexing_status,
        "indexed_at": source.indexed_at,
        "indexing_error": source.indexing_error,
        "freshness_score": source.freshness_score,
        "content_hash": source.content_hash,
        "created_at": source.created_at,
        "updated_at": source.updated_at,
    }


@router.post("/admin/imports/preview")
async def preview_import(
    file: UploadFile = File(...),
    _: dict = Depends(require_admin),
) -> dict:
    try:
        payload = await file.read()
        records = _parse_file(file.filename or "upload.txt", payload)
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {
        "filename": file.filename,
        "items": len(records),
        "records": records,
        "limits": {"max_bytes": MAX_FILE_BYTES, "max_items": MAX_ITEMS},
    }


@router.post("/admin/imports")
async def import_file(
    file: UploadFile = File(...),
    ingest: bool = Query(default=False),
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
) -> dict:
    try:
        payload = await file.read()
        records = _parse_file(file.filename or "upload.txt", payload)
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    created: list[int] = []
    duplicates: list[int] = []
    errors: list[str] = []
    seen_hashes: set[str] = set()

    for index, record in enumerate(records, start=1):
        content_hash = hashlib.sha256(
            (record["title"] + "\n" + record["content"]).encode("utf-8")
        ).hexdigest()
        if content_hash in seen_hashes:
            duplicates.append(index)
            continue
        seen_hashes.add(content_hash)
        existing = (
            db.query(models.IntelligenceSource)
            .filter(models.IntelligenceSource.content_hash == content_hash)
            .first()
        )
        if existing:
            duplicates.append(index)
            continue
        source = models.IntelligenceSource(
            title=record["title"],
            url=record["url"],
            source_type="file",
            category=record["source_category"],
            trust_level="standard",
            trust_score=0.5,
            notes=record["notes"],
            content_text=record["content"],
            content_hash=content_hash,
            knowledge_status="new",
            publication_status="unpublished",
            source_version=1,
            indexing_status="not_indexed",
            freshness_score=1.0,
        )
        db.add(source)
        db.flush()
        created.append(source.id)

    db.commit()

    indexed = 0
    if ingest and created:
        for source_id in created:
            source = db.query(models.IntelligenceSource).filter(models.IntelligenceSource.id == source_id).first()
            if not source:
                continue
            source.indexing_status = "processing"
            try:
                ingest_intelligence_source(db, source)
                source.indexing_status = "indexed"
                source.indexed_at = datetime.now(UTC)
                source.indexing_error = None
                indexed += 1
            except Exception as exc:
                source.indexing_status = "failed"
                source.indexing_error = str(exc)[:1000]
            db.commit()

    return {
        "imported": len(created),
        "ids": created,
        "duplicates": duplicates,
        "errors": errors,
        "indexed": indexed,
        "actor": str(admin.get("sub", "admin")),
    }


@router.get("/admin/knowledge/sources")
def list_sources(
    status_filter: str | None = Query(default=None, alias="status"),
    indexing_status: str | None = None,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> list[dict]:
    query = db.query(models.IntelligenceSource)
    if status_filter:
        if status_filter not in KNOWLEDGE_STATUSES:
            raise HTTPException(status_code=422, detail="invalid knowledge status")
        query = query.filter(models.IntelligenceSource.knowledge_status == status_filter)
    if indexing_status:
        query = query.filter(models.IntelligenceSource.indexing_status == indexing_status)
    return [_source_payload(item) for item in query.order_by(models.IntelligenceSource.updated_at.desc()).limit(500).all()]


@router.post("/admin/knowledge/sources/{source_id}/reindex")
def reindex_source(
    source_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    source = db.query(models.IntelligenceSource).filter(models.IntelligenceSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    source.indexing_status = "processing"
    source.indexing_error = None
    db.commit()
    try:
        count = ingest_intelligence_source(db, source)
        source.indexing_status = "indexed"
        source.indexed_at = datetime.now(UTC)
        source.indexing_error = None
        db.commit()
    except Exception as exc:
        source.indexing_status = "failed"
        source.indexing_error = str(exc)[:1000]
        db.commit()
        raise HTTPException(status_code=503, detail="Source re-index failed") from exc
    return {"source_id": source.id, "chunks": count, "status": source.indexing_status}


@router.delete("/admin/knowledge/sources/{source_id}")
def delete_source(
    source_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    source = db.query(models.IntelligenceSource).filter(models.IntelligenceSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    db.query(models.DocumentEmbedding).filter(
        models.DocumentEmbedding.source_type == "intelligence_source",
        models.DocumentEmbedding.source_id == str(source_id),
    ).delete(synchronize_session=False)
    db.delete(source)
    db.commit()
    return {"deleted": True, "source_id": source_id}


@router.patch("/admin/knowledge/sources/{source_id}/status")
def update_source_status(
    source_id: int,
    knowledge_status: str,
    publication_status: str | None = None,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    if knowledge_status not in KNOWLEDGE_STATUSES:
        raise HTTPException(status_code=422, detail="invalid knowledge status")
    if publication_status and publication_status not in PUBLICATION_STATUSES:
        raise HTTPException(status_code=422, detail="invalid publication status")
    source = db.query(models.IntelligenceSource).filter(models.IntelligenceSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    source.knowledge_status = knowledge_status
    if publication_status:
        source.publication_status = publication_status
    db.commit()
    return _source_payload(source)


@router.get("/admin/knowledge/citations")
def source_citations(
    source_ids: str = Query(default=""),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> list[dict]:
    ids = {int(value) for value in source_ids.split(",") if value.strip().isdigit()}
    sources = db.query(models.IntelligenceSource).filter(models.IntelligenceSource.id.in_(ids)).all() if ids else []
    return [
        {
            "source_id": source.id,
            "title": source.title,
            "url": source.url,
            "excerpt": (source.content_text or source.notes)[:500],
            "trust_score": source.trust_score,
            "freshness_score": source.freshness_score,
            "updated_at": source.updated_at,
        }
        for source in sources
    ]
