from __future__ import annotations

import os
import re
import json
from html import escape
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..analytics import log_analytics_event
from ..database import get_db
from ..integration_service import import_rss_feed
from ..llm.router import LLMRouter
from ..models import utc_now
from ..security import require_admin

router = APIRouter()


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9\s-]", "", value.lower()).strip()
    slug = re.sub(r"[\s-]+", "-", slug)
    return slug[:90] or "ai-generated-insight"


def unique_slug(db: Session, title: str) -> str:
    base_slug = slugify(title)
    slug = base_slug
    suffix = 2
    while db.query(models.Post).filter(models.Post.slug == slug).first():
        slug = f"{base_slug}-{suffix}"
        suffix += 1
    return slug


def build_steps(message: str, sources: list[models.IntelligenceSource]) -> list[tuple[str, str]]:
    source_count = len(sources)
    return [
        ("planner", f"Objective parsed: {message[:180]}"),
        ("researcher", f"{source_count} source record(s) selected for grounded context."),
        ("analyst", "Signals grouped by risk, operations impact, and Myanmar business relevance."),
        ("writer", "Private insight draft prepared for admin review."),
        ("reviewer", "Draft held in preview queue. Nothing is public until publish is approved."),
    ]


def generate_local_brief(message: str, sources: list[models.IntelligenceSource]) -> dict[str, str]:
    category = sources[0].category if sources else "Supply Chain"
    source_titles = ", ".join(source.title for source in sources[:4]) or "manual operator prompt"
    source_notes = " ".join(source.notes for source in sources if source.notes).strip()
    source_context = source_notes[:900] if source_notes else "No detailed source notes were attached."
    title = f"AI Preview: {category} Signal Brief"
    excerpt = (
        f"Private AI-generated draft based on {source_titles}. Review source quality, edit the language, "
        "then publish only when ready."
    )
    content = f"""
<h2>{title}</h2>
<p><strong>Objective:</strong> {message}</p>
<p><strong>Source basis:</strong> {source_titles}</p>
<p>{source_context}</p>
<h3>Analyst view</h3>
<p>This draft highlights the likely operational impact, decision points, and follow-up checks for Myanmar supply chain teams. Treat it as an editorial starting point, not an automatic publication.</p>
<h3>Recommended action</h3>
<p>Confirm facts against the listed sources, tighten the business language, and publish only after admin approval.</p>
""".strip()
    return {"category": category, "title": title, "excerpt": excerpt, "content": content}


def score_source_grounding(sources: list[models.IntelligenceSource]) -> tuple[float, float]:
    if not sources:
        return 0.35, 0.45
    trust_bonus = {"standard": 0.1, "verified": 0.2, "high": 0.28}
    note_quality = min(sum(len(source.notes or "") for source in sources) / 1600, 0.25)
    trust_quality = min(sum(trust_bonus.get(source.trust_level, 0.1) for source in sources), 0.35)
    confidence = min(0.45 + note_quality + trust_quality, 0.95)
    hallucination = max(0.05, 0.55 - confidence / 2)
    return round(confidence, 2), round(hallucination, 2)


def parse_agent_json(text: str) -> dict[str, Any] | None:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned).removesuffix("```").strip()
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def normalize_agent_brief(data: dict[str, Any] | None, message: str, sources: list[models.IntelligenceSource], raw_text: str = "") -> dict[str, str]:
    fallback = generate_local_brief(message, sources)
    if not data:
        safe_text = raw_text.strip()
        if safe_text:
            fallback["content"] = f"{fallback['content']}<hr/><h3>Provider draft</h3><p>{escape(safe_text[:2500])}</p>"
        return fallback
    return {
        "category": data.get("category") or (sources[0].category if sources else "Supply Chain"),
        "title": data.get("title") or "AI Preview: Supply Chain Signal Brief",
        "excerpt": data.get("excerpt") or "Private AI-generated draft for admin review.",
        "content": data.get("content_html") or data.get("content") or fallback["content"],
        "model": str(data.get("model") or ""),
    }


async def generate_agent_brief(
    message: str,
    sources: list[models.IntelligenceSource],
    db: Session | None = None,
) -> dict[str, str]:
    rag_context = ""
    if db is not None:
        from ..rag.search import build_rag_context

        rag_context = build_rag_context(db, message, [source.id for source in sources])

    if db is None:
        brief = generate_local_brief(message, sources)
        if rag_context and "No retrieved" not in rag_context:
            brief["content"] = f"{brief['content']}<hr/><h3>Retrieved context</h3><pre>{rag_context[:4000]}</pre>"
        return brief
    try:
        source_payload = [
            {
                "title": source.title,
                "url": source.url,
                "category": source.category,
                "trust_level": source.trust_level,
                "notes": source.notes[:1200],
            }
            for source in sources
        ]
        prompt = (
            "Create a private Logixa Flow supply chain insight draft. "
            "Return compact JSON with title, category, excerpt, content_html. "
            "Do not invent facts outside the source notes or retrieved context. "
            f"Objective: {message}\nSources: {source_payload}\n\n{rag_context}"
        )
        text, model_used = LLMRouter(db).generate_with_provider(prompt)
        data = parse_agent_json(text)
        brief = normalize_agent_brief(data, message, sources, raw_text=text)
        brief["model"] = model_used
        # estimate cost and log if DB provided
        try:
            char_count = len(text)
            tokens = max(1, int(char_count / 4))
            cost_per_1k = float(os.getenv("AI_COST_PER_1K", "0.002"))
            amount = round((tokens / 1000.0) * cost_per_1k, 8)
            log_analytics_event(db, "api_cost", {"service": "llm_generate", "amount": amount, "tokens": tokens, "model": model_used})
        except Exception:
            pass
        return brief
    except Exception:
        return generate_local_brief(message, sources)


def serialize_run(db: Session, run: models.AgentRun) -> schemas.AgentRunOut:
    steps = (
        db.query(models.AgentStep)
        .filter(models.AgentStep.run_id == run.id)
        .order_by(models.AgentStep.step_order.asc())
        .all()
    )
    memory = None
    if run.final_memory_id:
        memory = db.query(models.AiMemoryBrain).filter(models.AiMemoryBrain.id == run.final_memory_id).first()
    return schemas.AgentRunOut.model_validate({**run.__dict__, "steps": steps, "memory": memory})


@router.post("/admin/sources", response_model=schemas.IntelligenceSourceOut, status_code=status.HTTP_201_CREATED)
def create_source(
    payload: schemas.IntelligenceSourceCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> models.IntelligenceSource:
    source = models.IntelligenceSource(**payload.model_dump())
    db.add(source)
    db.commit()
    db.refresh(source)
    log_analytics_event(db, "source_added", {"source_id": source.id, "source_type": source.source_type})
    try:
        from ..rag.ingest import ingest_intelligence_source

        ingest_intelligence_source(db, source)
    except Exception:
        pass
    return source


@router.get("/admin/sources", response_model=list[schemas.IntelligenceSourceOut])
def list_sources(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> list[models.IntelligenceSource]:
    return db.query(models.IntelligenceSource).order_by(models.IntelligenceSource.updated_at.desc()).limit(100).all()


@router.post("/admin/sources/fetch-rss", response_model=schemas.SourceFetchOut)
def fetch_rss_sources(
    payload: schemas.SourceFetchRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> schemas.SourceFetchOut:
    imported, skipped = import_rss_feed(
        db,
        payload.feed_url,
        category=payload.category,
        trust_level=payload.trust_level,
        limit=payload.limit,
    )
    if imported == 0 and skipped == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="RSS feed could not be fetched or parsed")
    return schemas.SourceFetchOut(imported=imported, skipped=skipped)


@router.post("/agent/run", response_model=schemas.AgentRunOut, status_code=status.HTTP_201_CREATED)
async def run_agent(
    payload: schemas.AgentRunRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> schemas.AgentRunOut:
    sources = []
    if payload.source_ids:
        sources = (
            db.query(models.IntelligenceSource)
            .filter(models.IntelligenceSource.id.in_(payload.source_ids))
            .all()
        )
    brief = await generate_agent_brief(payload.message, sources, db=db)
    confidence_score, hallucination_score = score_source_grounding(sources)
    run = models.AgentRun(objective=payload.message, model=brief.get("model") or os.getenv("AI_AGENT_MODEL", "local-planner"), status="completed")
    db.add(run)
    db.commit()
    db.refresh(run)
    for index, (agent, message) in enumerate(build_steps(payload.message, sources), start=1):
        db.add(models.AgentStep(run_id=run.id, step_order=index, agent=agent, message=message))
    memory = models.AiMemoryBrain(
        category=brief["category"],
        source_title=brief["title"],
        source_url=sources[0].url if sources else None,
        prompt=payload.message,
        content=brief["content"],
        summary=brief["excerpt"],
        status="pending",
        is_public=False,
        confidence_score=confidence_score,
        hallucination_score=hallucination_score,
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)
    run.final_memory_id = memory.id
    db.commit()
    db.refresh(run)
    try:
        from ..rag.ingest import ingest_brain_memory

        ingest_brain_memory(db, memory)
    except Exception:
        pass
    log_analytics_event(db, "agent_run", {"run_id": run.id, "memory_id": memory.id, "confidence_score": confidence_score})
    return serialize_run(db, run)


@router.get("/admin/agent/runs", response_model=schemas.AgentRunsPage)
def list_agent_runs(
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    status_filter: str | None = Query(default=None, alias="status", max_length=40),
    search: str | None = Query(default=None, min_length=1, max_length=120),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> schemas.AgentRunsPage:
    query = db.query(models.AgentRun)
    normalized_status = status_filter.strip().lower() if status_filter else ""
    normalized_search = search.strip() if search else ""
    if normalized_status:
        query = query.filter(models.AgentRun.status == normalized_status)
    if normalized_search:
        pattern = f"%{normalized_search}%"
        query = query.filter(
            models.AgentRun.objective.ilike(pattern) | models.AgentRun.model.ilike(pattern)
        )

    total = query.count()
    runs = (
        query.order_by(models.AgentRun.created_at.desc(), models.AgentRun.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return schemas.AgentRunsPage(
        items=[serialize_run(db, run) for run in runs],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(runs) < total,
    )


@router.post("/admin/agent/feedback", response_model=schemas.AgentFeedbackOut, status_code=status.HTTP_201_CREATED)
def submit_agent_feedback(
    payload: schemas.AgentFeedbackRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> models.AgentFeedbackEvent:
    run = db.query(models.AgentRun).filter(models.AgentRun.id == payload.run_id).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent run not found")

    existing = (
        db.query(models.AgentFeedbackEvent)
        .filter(models.AgentFeedbackEvent.run_id == payload.run_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Feedback already submitted for this run")

    event = models.AgentFeedbackEvent(run_id=payload.run_id, rating=payload.rating)
    db.add(event)
    db.commit()
    db.refresh(event)
    log_analytics_event(db, "agent_feedback", {"run_id": payload.run_id, "rating": payload.rating})
    return event


@router.get("/admin/brain", response_model=list[schemas.AiMemoryOut])
def list_brain_items(
    status_filter: schemas.BrainStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> list[models.AiMemoryBrain]:
    query = db.query(models.AiMemoryBrain)
    if status_filter:
        query = query.filter(models.AiMemoryBrain.status == status_filter)
    return query.order_by(models.AiMemoryBrain.updated_at.desc()).limit(100).all()


@router.patch("/admin/brain/{memory_id}/approve", response_model=schemas.AiMemoryOut)
def approve_memory(
    memory_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> models.AiMemoryBrain:
    memory = db.query(models.AiMemoryBrain).filter(models.AiMemoryBrain.id == memory_id).first()
    if not memory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory item not found")
    memory.status = "approved"
    memory.is_public = False
    db.commit()
    db.refresh(memory)
    log_analytics_event(db, "brain_approved", {"memory_id": memory.id})
    return memory


@router.patch("/admin/brain/{memory_id}/reject", response_model=schemas.AiMemoryOut)
def reject_memory(
    memory_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> models.AiMemoryBrain:
    memory = db.query(models.AiMemoryBrain).filter(models.AiMemoryBrain.id == memory_id).first()
    if not memory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory item not found")
    memory.status = "rejected"
    memory.is_public = False
    db.commit()
    db.refresh(memory)
    log_analytics_event(db, "brain_rejected", {"memory_id": memory.id})
    return memory


@router.patch("/admin/brain/{memory_id}/publish", response_model=schemas.PostOut)
def publish_memory(
    memory_id: int,
    payload: schemas.BrainPublishRequest,
    db: Session = Depends(get_db),
    response: Response = None,
    admin: dict = Depends(require_admin),
) -> models.Post:
    memory = db.query(models.AiMemoryBrain).filter(models.AiMemoryBrain.id == memory_id).first()
    if not memory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory item not found")
    if memory.post_slug:
        post = db.query(models.Post).filter(models.Post.slug == memory.post_slug).first()
        if not post:
            log_analytics_event(
                db,
                "brain_publish_conflict",
                {
                    "actor": str(admin.get("sub", "admin")),
                    "action": "publish",
                    "object": {"memory_id": memory.id, "post_slug": memory.post_slug},
                    "result": "linked_post_unavailable",
                },
            )
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Linked brain post is unavailable")
        if payload.publish_now and (not post.is_published or post.status != "published"):
            post.status = "published"
            post.is_published = True
            post.published_at = post.published_at or utc_now()
            memory.status = "published"
            memory.is_public = True
            db.commit()
            db.refresh(post)
            result = "republished_linked"
            event_type = "brain_published"
        else:
            result = "idempotent"
            event_type = "brain_publish_idempotent"
        if response is not None:
            response.headers["X-Brain-Publish-Result"] = result
        db.commit()
        db.refresh(memory)
        log_analytics_event(
            db,
            event_type,
            {
                "actor": str(admin.get("sub", "admin")),
                "action": "publish",
                "object": {"memory_id": memory.id, "post_id": post.id, "post_slug": post.slug},
                "result": result,
            },
        )
        return post
    slug = unique_slug(db, memory.source_title)
    post = models.Post(
        title=memory.source_title,
        slug=slug,
        type="analysis",
        category=memory.category,
        excerpt=memory.summary[:500],
        content_html=memory.content,
        source_url=memory.source_url,
        status="published" if payload.publish_now else "draft",
        is_published=payload.publish_now,
        published_at=utc_now() if payload.publish_now else None,
    )
    db.add(post)
    memory.status = "published" if payload.publish_now else "approved"
    memory.is_public = payload.publish_now
    memory.post_slug = slug
    db.commit()
    db.refresh(post)
    if response is not None:
        response.headers["X-Brain-Publish-Result"] = "created"
    log_analytics_event(
        db,
        "brain_published" if payload.publish_now else "brain_draft_created",
        {
            "actor": str(admin.get("sub", "admin")),
            "action": "publish",
            "object": {"memory_id": memory.id, "post_id": post.id, "post_slug": slug},
            "result": "created",
        },
    )
    return post


@router.patch("/admin/brain/{memory_id}/unpublish", response_model=schemas.AiMemoryOut)
def unpublish_memory(
    memory_id: int,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
) -> models.AiMemoryBrain:
    memory = db.query(models.AiMemoryBrain).filter(models.AiMemoryBrain.id == memory_id).first()
    if not memory or memory.status != "published" or not memory.is_public or not memory.post_slug:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Published brain item not found")

    post = db.query(models.Post).filter(models.Post.slug == memory.post_slug).first()
    if not post or not post.is_published or post.status != "published":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Published brain item not found")

    post.is_published = False
    post.status = "draft"
    post.published_at = None
    memory.is_public = False
    memory.status = "approved"
    db.commit()
    db.refresh(memory)
    log_analytics_event(
        db,
        "brain_unpublished",
        {
            "actor": str(admin.get("sub", "admin")),
            "action": "unpublish",
            "object": {"memory_id": memory.id, "post_slug": memory.post_slug},
            "result": "soft_unpublished",
        },
    )
    return memory


@router.post("/admin/brain/{memory_id}/rate", response_model=schemas.AiMemoryOut)
def rate_memory(
    memory_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> models.AiMemoryBrain:
    """Rate/provide feedback on a brain memory (score: -1 for unhelpful, 1 for helpful)."""
    memory = db.query(models.AiMemoryBrain).filter(models.AiMemoryBrain.id == memory_id).first()
    if not memory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory item not found")
    
    score = payload.get("score", 0)
    if score not in [-1, 1]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Score must be -1 or 1")
    
    memory.feedback_score = score
    db.commit()
    db.refresh(memory)
    log_analytics_event(db, "brain_rated", {"memory_id": memory.id, "score": score})
    return memory
