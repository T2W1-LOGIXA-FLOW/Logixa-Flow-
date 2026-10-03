from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
import os
from typing import Optional

from .. import schemas, models
from ..database import get_db
from ..integration_service import (
    import_draft_dict,
    import_drafts_from_folder,
    run_preview_agent,
    sync_default_feeds,
    configured_rss_feeds,
    import_rss_feed,
)
from ..security import require_admin, require_admin_or_service
import json

router = APIRouter()


@router.post("/admin/integration/sync-feeds")
def integration_sync_feeds(
    limit_per_feed: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin_or_service),
) -> dict:
    """Import RSS items from INTEGRATION_RSS_FEEDS (or defaults) into intelligence_sources."""
    return sync_default_feeds(db, limit_per_feed=limit_per_feed)


@router.post("/admin/integration/import-drafts")
def integration_import_drafts(
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin_or_service),
) -> dict:
    """Import recent JSON drafts from agents/data/drafts into brain queue (pending)."""
    return import_drafts_from_folder(db, limit=limit)


@router.post("/admin/integration/import-draft", response_model=schemas.AiMemoryOut)
def integration_import_one_draft(
    payload: schemas.CliDraftImport,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin_or_service),
) -> schemas.AiMemoryOut:
    memory = import_draft_dict(db, payload.model_dump())
    if not memory:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Draft payload invalid or empty")
    return memory


@router.post("/admin/integration/pipeline-preview")
async def integration_pipeline_preview(
    sync_feeds: bool = Query(default=True),
    import_cli_drafts: bool = Query(default=True),
    run_agent: bool = Query(default=True),
    ingest_rag: bool = Query(default=True),
    feed_limit: int = Query(default=5, ge=1, le=20),
    draft_limit: int = Query(default=5, ge=0, le=50),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin_or_service),
) -> dict:
    """
    One-shot preview pipeline (never publishes):
    1) Sync default RSS feeds → sources
    2) Import recent CLI drafts → brain pending
    3) Run web agent → new brain pending
    """
    result: dict = {"publish": False, "steps": {}}
    if sync_feeds:
        result["steps"]["sync_feeds"] = sync_default_feeds(db, limit_per_feed=feed_limit)
    if import_cli_drafts and draft_limit > 0:
        result["steps"]["import_drafts"] = import_drafts_from_folder(db, limit=draft_limit)
    if run_agent:
        result["steps"]["agent_run"] = await run_preview_agent(db)
    if ingest_rag:
        from ..rag.ingest import ingest_all_sources

        result["steps"]["rag_ingest"] = ingest_all_sources(db, limit=200)
    return result


# ===== NEW: Feed Management CRUD with Database Persistence =====

@router.get("/admin/integration/feeds")
def list_integration_feeds(db: Session = Depends(get_db), _: dict = Depends(require_admin)) -> dict:
    """List all feed sources from database."""
    feeds = db.query(models.FeedSource).filter(models.FeedSource.is_active == True).all()
    return {
        "feeds": [
            {
                "id": f.id,
                "url": f.url,
                "title": f.title,
                "category": f.category,
                "trust_level": f.trust_level,
                "is_active": f.is_active,
                "last_scrape_at": f.last_scrape_at.isoformat() if f.last_scrape_at else None,
                "last_scrape_status": f.last_scrape_status,
                "scrape_count": f.scrape_count,
            }
            for f in feeds
        ]
    }


@router.post("/admin/integration/feeds")
def add_integration_feed(
    payload: dict,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    """Add a new feed URL to database. Expects JSON { "url": "https://...", "title": "...", "category": "...", "trust_level": "..." }"""
    url = (payload.get("url") or "").strip()
    if not url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing url")
    
    # Check if feed already exists
    existing = db.query(models.FeedSource).filter(models.FeedSource.url == url).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Feed URL already exists")
    
    title = (payload.get("title") or url).strip()[:255]
    category = (payload.get("category") or "Supply Chain").strip()[:80]
    trust_level = (payload.get("trust_level") or "standard").strip()[:40]
    
    feed = models.FeedSource(
        url=url,
        title=title,
        category=category,
        trust_level=trust_level,
        is_active=True,
    )
    db.add(feed)
    db.commit()
    db.refresh(feed)
    
    return {
        "id": feed.id,
        "url": feed.url,
        "title": feed.title,
        "category": feed.category,
        "trust_level": feed.trust_level,
        "message": "Feed added successfully",
    }


@router.patch("/admin/integration/feeds/{feed_id}")
def update_integration_feed(
    feed_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    """Update a feed by ID."""
    feed = db.query(models.FeedSource).filter(models.FeedSource.id == feed_id).first()
    if not feed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feed not found")
    
    if "url" in payload:
        new_url = (payload.get("url") or "").strip()
        if new_url:
            existing = db.query(models.FeedSource).filter(
                models.FeedSource.url == new_url,
                models.FeedSource.id != feed_id
            ).first()
            if existing:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="URL already in use")
            feed.url = new_url
    
    if "title" in payload:
        feed.title = (payload.get("title") or "").strip()[:255]
    
    if "category" in payload:
        feed.category = (payload.get("category") or "Supply Chain").strip()[:80]
    
    if "trust_level" in payload:
        feed.trust_level = (payload.get("trust_level") or "standard").strip()[:40]
    
    if "is_active" in payload:
        feed.is_active = bool(payload.get("is_active"))
    
    db.commit()
    db.refresh(feed)
    
    return {
        "id": feed.id,
        "url": feed.url,
        "title": feed.title,
        "category": feed.category,
        "trust_level": feed.trust_level,
        "is_active": feed.is_active,
        "message": "Feed updated successfully",
    }


@router.delete("/admin/integration/feeds/{feed_id}")
def delete_integration_feed(
    feed_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    """Delete a feed by ID."""
    feed = db.query(models.FeedSource).filter(models.FeedSource.id == feed_id).first()
    if not feed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feed not found")
    
    db.delete(feed)
    db.commit()
    
    return {"message": "Feed deleted successfully", "id": feed_id}


@router.post("/admin/integration/feeds/{feed_id}/scrape")
def scrape_feed(
    feed_id: int,
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    """Manually trigger a scrape for a single feed."""
    feed = db.query(models.FeedSource).filter(models.FeedSource.id == feed_id).first()
    if not feed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feed not found")
    
    # Update status to scraping
    feed.last_scrape_status = "scraping"
    db.commit()
    
    try:
        # Perform the scrape
        imported, skipped = import_rss_feed(
            db,
            feed.url,
            category=feed.category,
            trust_level=feed.trust_level,
            limit=limit,
        )
        
        # Update feed metadata
        feed.last_scrape_status = "done"
        feed.scrape_count += 1
        feed.last_scrape_at = models.utc_now()
        db.commit()
        db.refresh(feed)
        
        return {
            "feed_id": feed.id,
            "imported": imported,
            "skipped": skipped,
            "status": "done",
            "last_scrape_at": feed.last_scrape_at.isoformat() if feed.last_scrape_at else None,
            "scrape_count": feed.scrape_count,
        }
    except Exception as exc:
        feed.last_scrape_status = "error"
        db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Scrape failed: {str(exc)}")


@router.get("/admin/integration/feeds/status")
def get_feeds_status(db: Session = Depends(get_db), _: dict = Depends(require_admin)) -> dict:
    """Get status and last scrape info for all feeds."""
    feeds = db.query(models.FeedSource).all()
    return {
        "feeds": [
            {
                "id": f.id,
                "url": f.url,
                "title": f.title,
                "last_scrape_at": f.last_scrape_at.isoformat() if f.last_scrape_at else None,
                "last_scrape_status": f.last_scrape_status,
                "scrape_count": f.scrape_count,
                "is_active": f.is_active,
            }
            for f in feeds
        ]
    }


# ===== Duplicate Detection Helper =====

def check_duplicate_source(db: Session, title: str, url: Optional[str]) -> bool:
    """Check if a similar source already exists."""
    if url:
        existing = db.query(models.IntelligenceSource).filter(
            models.IntelligenceSource.url == url
        ).first()
        if existing:
            return True
    
    # Check by title similarity (simple substring match)
    existing = db.query(models.IntelligenceSource).filter(
        models.IntelligenceSource.title.ilike(f"%{title[:50]}%")
    ).first()
    return existing is not None


# --- Integration trigger endpoints: email, pdf, webhook ---
@router.post("/admin/integration/trigger-email")
def trigger_email_endpoint(payload: dict, db: Session = Depends(get_db), _: dict = Depends(require_admin)) -> dict:
    """Trigger a test email (queued via Celery if configured). Payload: { to, subject, body? }"""
    to = (payload.get("to") or "").strip()
    subject = (payload.get("subject") or "Test email from Logixa Flow").strip()
    body = payload.get("body") or "This is a test email from Logixa Flow."
    if not to:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing 'to' address")
    try:
        from ..tasks import send_email_task

        # prefer queuing via Celery
        try:
            send_email_task.delay(to, subject, body)
            return {"message": "Email queued"}
        except Exception:
            # fallback to synchronous apply
            res = send_email_task.apply(args=(to, subject, body))
            return {"message": "Email sent (sync)", "result": res.get()}
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))
