"""
Brain Layer management router.

Provides admin endpoints to:
- Read/write BrainContext entries (Soul File)
- Trigger and read BrainSynthesis snapshots
- Query accumulated brain intelligence by date range and category
"""

from __future__ import annotations

import json
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..models import utc_now
from ..security import require_admin

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class BrainContextIn(BaseModel):
    context_key: str = Field(..., min_length=1, max_length=120)
    context_value: str = Field(..., min_length=1)
    description: str = Field(default="", max_length=500)
    is_active: bool = True


class BrainContextOut(BaseModel):
    id: int
    context_key: str
    context_value: str
    description: str
    is_active: bool
    last_updated_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BrainSynthesisOut(BaseModel):
    id: int
    period_label: str
    period_start: datetime
    period_end: datetime
    category: str
    synthesis_text: str
    memory_count: int
    provider: str | None
    token_usage: int | None
    created_at: datetime

    class Config:
        from_attributes = True


class BrainQueryResult(BaseModel):
    period: str
    categories: list[str]
    memories_found: int
    synthesis_available: bool
    synthesis_text: str | None
    memory_summaries: list[dict]


# ---------------------------------------------------------------------------
# BrainContext — Soul File CRUD
# ---------------------------------------------------------------------------

@router.get("/context", response_model=list[BrainContextOut])
def list_brain_context(
    include_inactive: bool = Query(default=False),
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """List all Soul File context entries."""
    q = db.query(models.BrainContext)
    if not include_inactive:
        q = q.filter(models.BrainContext.is_active == True)  # noqa: E712
    return q.order_by(models.BrainContext.context_key).all()


@router.post("/context", response_model=BrainContextOut, status_code=status.HTTP_201_CREATED)
def upsert_brain_context(
    payload: BrainContextIn,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """
    Create or update a Soul File context entry by key.

    If a row with the same context_key already exists it is updated in-place;
    otherwise a new row is inserted.
    """
    actor = admin.get("sub", "admin")
    existing = (
        db.query(models.BrainContext)
        .filter(models.BrainContext.context_key == payload.context_key)
        .first()
    )
    if existing:
        existing.context_value = payload.context_value
        existing.description = payload.description
        existing.is_active = payload.is_active
        existing.last_updated_by = actor
        db.commit()
        db.refresh(existing)
        return existing

    entry = models.BrainContext(
        context_key=payload.context_key,
        context_value=payload.context_value,
        description=payload.description,
        is_active=payload.is_active,
        last_updated_by=actor,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/context/{context_key}", status_code=status.HTTP_204_NO_CONTENT)
def delete_brain_context(
    context_key: str,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Permanently delete a Soul File context entry by key."""
    entry = (
        db.query(models.BrainContext)
        .filter(models.BrainContext.context_key == context_key)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Context key not found")
    db.delete(entry)
    db.commit()


# ---------------------------------------------------------------------------
# BrainSynthesis — Weekly Snapshots
# ---------------------------------------------------------------------------

@router.get("/syntheses", response_model=list[BrainSynthesisOut])
def list_brain_syntheses(
    category: str | None = Query(default=None),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """List weekly brain synthesis snapshots, newest first."""
    q = db.query(models.BrainSynthesis)
    if category:
        q = q.filter(models.BrainSynthesis.category == category)
    return q.order_by(models.BrainSynthesis.created_at.desc()).limit(limit).all()


@router.post("/synthesize", status_code=status.HTTP_202_ACCEPTED)
def trigger_synthesis(
    category: str = Query(default="Supply Chain"),
    force: bool = Query(
        default=False,
        description="If true, delete this week's existing synthesis first and regenerate",
    ),
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """
    Manually trigger a brain synthesis for the given category.

    Use force=true to regenerate even if this week's snapshot already exists.
    The job runs synchronously and returns the new synthesis id.
    """
    from ..scheduler import run_weekly_brain_synthesis

    if force:
        period_label = datetime.now(timezone.utc).strftime("%Y-W%W")
        stale = (
            db.query(models.BrainSynthesis)
            .filter(
                models.BrainSynthesis.period_label == period_label,
                models.BrainSynthesis.category == category,
            )
            .first()
        )
        if stale:
            db.delete(stale)
            db.commit()

    synthesis_id = run_weekly_brain_synthesis(category)
    if synthesis_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Synthesis skipped: not enough approved memories (need ≥ 3) "
                "or synthesis already exists for this week. "
                "Use force=true to regenerate an existing snapshot."
            ),
        )
    return {"synthesis_id": synthesis_id, "category": category, "status": "created"}


# ---------------------------------------------------------------------------
# Temporal Brain Query
# ---------------------------------------------------------------------------

@router.get("/query", response_model=BrainQueryResult)
def brain_query(
    days: int = Query(default=7, ge=1, le=90, description="Look back N days"),
    category: str | None = Query(default=None, description="Filter by category"),
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """
    Query accumulated brain intelligence for a time window.

    Returns:
    - Relevant approved memory summaries
    - The latest weekly synthesis if available
    - Memory counts by category
    """
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    mem_q = db.query(models.AiMemoryBrain).filter(
        models.AiMemoryBrain.status == "approved",
        models.AiMemoryBrain.created_at >= since,
    )
    if category:
        mem_q = mem_q.filter(models.AiMemoryBrain.category == category)
    memories = mem_q.order_by(models.AiMemoryBrain.created_at.desc()).limit(50).all()

    syn_q = db.query(models.BrainSynthesis).filter(
        models.BrainSynthesis.period_start >= since,
    )
    if category:
        syn_q = syn_q.filter(models.BrainSynthesis.category == category)
    latest_synthesis = syn_q.order_by(models.BrainSynthesis.created_at.desc()).first()

    categories_found = list({m.category for m in memories})
    memory_summaries = [
        {
            "id": m.id,
            "title": m.source_title,
            "category": m.category,
            "summary": (m.summary or m.content or "")[:200],
            "created_at": m.created_at.isoformat(),
        }
        for m in memories[:20]
    ]

    return BrainQueryResult(
        period=f"Last {days} days (since {since.strftime('%Y-%m-%d')})",
        categories=categories_found,
        memories_found=len(memories),
        synthesis_available=latest_synthesis is not None,
        synthesis_text=latest_synthesis.synthesis_text if latest_synthesis else None,
        memory_summaries=memory_summaries,
    )


# ---------------------------------------------------------------------------
# Brain Status
# ---------------------------------------------------------------------------

@router.get("/status")
def brain_status(
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Quick overview of the brain layer health."""
    try:
        context_count = db.query(models.BrainContext).filter(
            models.BrainContext.is_active == True  # noqa: E712
        ).count()
        synthesis_count = db.query(models.BrainSynthesis).count()
        latest_synthesis = (
            db.query(models.BrainSynthesis)
            .order_by(models.BrainSynthesis.created_at.desc())
            .first()
        )
        approved_memory_count = db.query(models.AiMemoryBrain).filter(
            models.AiMemoryBrain.status == "approved"
        ).count()
    except Exception as exc:
        return {"status": "degraded", "error": str(exc)}

    return {
        "status": "ok",
        "soul_file_entries": context_count,
        "total_syntheses": synthesis_count,
        "latest_synthesis_period": latest_synthesis.period_label if latest_synthesis else None,
        "latest_synthesis_at": latest_synthesis.created_at.isoformat() if latest_synthesis else None,
        "approved_memories": approved_memory_count,
    }


# ---------------------------------------------------------------------------
# Blog Auto-Draft Generation
# ---------------------------------------------------------------------------

class BlogDraftOut(BaseModel):
    draft_id: int | None
    title: str
    outline: str
    intro_paragraph: str
    suggested_tags: list[str]
    image_url: str | None = None
    source_synthesis_id: int | None
    generated_at: str


@router.post("/draft-blog", response_model=BlogDraftOut, status_code=status.HTTP_201_CREATED)
def generate_blog_draft(
    category: str = Query(default="Supply Chain"),
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """
    Generate a blog post draft from the latest brain synthesis with an AI-generated banner image.

    Steps:
    1. Fetch latest BrainSynthesis for given category.
    2. Call LLMRouter to produce title, outline, intro, tags as JSON.
    3. Generate AI banner image via Pollinations.ai FLUX model.
    4. Save as Post(status='draft', image_url=banner_url) — best-effort, no crash if model differs.
    5. Return BlogDraftOut with image_url.
    """
    import json as _json
    from ..llm.router import LLMRouter
    from ..services.image_generator import generate_blog_banner

    # 1. Latest synthesis for category
    synthesis = (
        db.query(models.BrainSynthesis)
        .filter(models.BrainSynthesis.category == category)
        .order_by(models.BrainSynthesis.created_at.desc())
        .first()
    )
    if not synthesis:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"No synthesis found for category '{category}'. "
                "Run POST /api/admin/brain/synthesize first."
            ),
        )

    # 2. LLM call
    llm = LLMRouter(db, role="admin")
    system_prompt = (
        "You are a professional blog writer. Given a news/industry synthesis report, "
        "generate a compelling blog post draft. "
        "Respond ONLY in JSON with keys: "
        '{"title": "...", "outline": "...", "intro_paragraph": "...", "suggested_tags": ["...", "..."]}'
    )
    user_prompt = (
        f"Category: {category}\n"
        f"Period: {synthesis.period_label}\n\n"
        f"Synthesis:\n{(synthesis.synthesis_text or '')[:3000]}"
    )

    result_text = ""
    try:
        result_text = llm.generate_with_provider(system_prompt, user_prompt) or ""
    except Exception:
        result_text = ""

    # 3. Parse JSON response
    data: dict = {}
    try:
        data = _json.loads(result_text)
    except Exception:
        pass

    # Extractive fallback if LLM fails or returns unparseable text
    if not data.get("title"):
        snippet = (synthesis.synthesis_text or "")[:400]
        data = {
            "title": f"{category} Insights — {synthesis.period_label}",
            "outline": "1. Key Developments\n2. Market Implications\n3. What To Watch Next",
            "intro_paragraph": snippet,
            "suggested_tags": [category.lower().replace(" ", "-"), "weekly-roundup"],
        }

    # 4. Generate AI Banner Image URL
    banner_url: str | None = None
    try:
        banner_url = generate_blog_banner(title=data["title"], category=category)
    except Exception:
        banner_url = None

    # 5. Save as draft Post (best-effort — won't crash if model schema differs)
    draft_id: int | None = None
    try:
        import re as _re
        slug_base = _re.sub(r"[^a-z0-9]+", "-", data["title"].lower()).strip("-")[:80]
        slug = f"{slug_base}-{synthesis.period_label.replace('/', '-').lower()}"

        img_tag = f'<p><img src="{banner_url}" alt="{data["title"]}" class="w-full rounded-xl my-4 shadow-md" /></p>\n\n' if banner_url else ""
        content_html = img_tag + data["intro_paragraph"] + "\n\n" + data["outline"]

        post = models.Post(
            title=data["title"],
            slug=slug,
            type="blog",
            category=category,
            excerpt=data["intro_paragraph"][:490] if data.get("intro_paragraph") else "",
            content_html=content_html,
            image_url=banner_url,
            status="draft",
            is_published=False,
        )
        db.add(post)
        db.commit()
        db.refresh(post)
        draft_id = post.id
    except Exception:
        db.rollback()
        draft_id = None

    return BlogDraftOut(
        draft_id=draft_id,
        title=data.get("title", ""),
        outline=data.get("outline", ""),
        intro_paragraph=data.get("intro_paragraph", ""),
        suggested_tags=data.get("suggested_tags", []),
        image_url=banner_url,
        source_synthesis_id=synthesis.id,
        generated_at=utc_now().isoformat(),
    )
