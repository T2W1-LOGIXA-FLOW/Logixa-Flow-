from __future__ import annotations

import json
import os
import re

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models, schemas
from ..cache import cache_client
from ..database import get_db
from ..models import utc_now
from ..security import require_admin

router = APIRouter()

def _get_api_secret() -> str:
    """Get API secret from environment, with production safety check."""
    secret = os.getenv("API_SECRET_TOKEN", "change-me-in-production")
    is_production = os.getenv("ENVIRONMENT", "development").lower() in {"production", "prod"}
    
    if is_production and secret in {"change-me-in-production", "", None}:
        raise ValueError(
            "CRITICAL: API_SECRET_TOKEN must be set in production. "
            "Using default secrets is not allowed in production environments."
        )
    
    return secret

API_SECRET = _get_api_secret()


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9\s-]", "", value.lower()).strip()
    slug = re.sub(r"[\s-]+", "-", slug)
    return slug[:90] or "imported-insight"


def verify_token(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    if token != API_SECRET:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid bearer token")
    return token


@router.post("/posts", response_model=schemas.PostOut, status_code=status.HTTP_201_CREATED)
def create_post(
    post: schemas.PostCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> models.Post:
    payload = post.model_dump()
    if payload["source_url"] is not None:
        payload["source_url"] = str(payload["source_url"])
    if payload.get("status") == "published":
        payload["is_published"] = True
    if payload.get("is_published"):
        payload["status"] = "published"
    db_post = models.Post(**payload)
    if db_post.is_published:
        db_post.published_at = utc_now()
    db.add(db_post)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Post slug already exists") from exc
    db.refresh(db_post)
    cache_client.delete_prefix("posts:")
    return db_post


@router.get("/posts/search", response_model=list[schemas.PostOut])
def search_posts(
    q: str = Query(..., min_length=1),
    category: schemas.PostCategory | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[models.Post]:
    search_value = f"%{q.strip()}%"
    query = (
        db.query(models.Post)
        .filter(
            models.Post.is_published.is_(True),
            models.Post.status == "published",
            or_(
                func.lower(models.Post.title).like(search_value.lower()),
                func.lower(models.Post.excerpt).like(search_value.lower()),
                func.lower(models.Post.content_html).like(search_value.lower()),
            ),
        )
    )
    if category:
        query = query.filter(models.Post.category == category)
    return query.order_by(models.Post.published_at.desc().nullslast(), models.Post.created_at.desc()).limit(50).all()


@router.get("/posts", response_model=list[schemas.PostOut])
def list_posts(
    db: Session = Depends(get_db),
    post_type: schemas.PostType | None = Query(default=None),
    category: schemas.PostCategory | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[models.Post]:
    cache_key = f"posts:list:{post_type}:{category}:{limit}:{offset}"
    cached = cache_client.get(cache_key)
    if cached:
        payload = json.loads(cached)
        return [schemas.PostOut.model_validate(item) for item in payload]  # type: ignore[return-value]

    query = db.query(models.Post).filter(models.Post.is_published.is_(True), models.Post.status == "published")
    if post_type:
        query = query.filter(models.Post.type == post_type)
    if category:
        query = query.filter(models.Post.category == category)
    posts = (
        query.order_by(models.Post.published_at.desc().nullslast(), models.Post.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    serialized = [schemas.PostOut.model_validate(post).model_dump(mode="json") for post in posts]
    cache_client.set(cache_key, json.dumps(serialized), ttl_seconds=60)
    return posts


@router.get("/posts/{slug}", response_model=schemas.PostOut)
def get_post(slug: str, db: Session = Depends(get_db)) -> models.Post:
    cache_key = f"posts:slug:{slug}"
    cached = cache_client.get_json(cache_key)
    if cached:
        return schemas.PostOut.model_validate(cached)  # type: ignore[return-value]
    post = (
        db.query(models.Post)
        .filter(models.Post.slug == slug, models.Post.is_published.is_(True), models.Post.status == "published")
        .first()
    )
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    cache_client.set_json(cache_key, schemas.PostOut.model_validate(post).model_dump(mode="json"), ttl_seconds=60)
    return post


@router.patch("/posts/{slug}", response_model=schemas.PostOut)
def update_post(
    slug: str,
    patch: schemas.PostUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> models.Post:
    post = db.query(models.Post).filter(models.Post.slug == slug).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    was_published = post.is_published
    for key, value in patch.model_dump(exclude_unset=True).items():
        if key == "source_url" and value is not None:
            value = str(value)
        setattr(post, key, value)
    if post.status == "published":
        post.is_published = True
    if post.is_published and not was_published:
        post.published_at = utc_now()
    db.commit()
    db.refresh(post)
    cache_client.delete_prefix("posts:")
    return post


@router.delete("/posts/{slug}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    slug: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> None:
    post = db.query(models.Post).filter(models.Post.slug == slug).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    db.delete(post)
    db.commit()
    cache_client.delete_prefix("posts:")


@router.get("/admin/posts", response_model=list[schemas.PostOut])
def list_admin_posts(
    status_filter: schemas.PostStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> list[models.Post]:
    query = db.query(models.Post)
    if status_filter:
        query = query.filter(models.Post.status == status_filter)
    return query.order_by(models.Post.updated_at.desc(), models.Post.created_at.desc()).limit(100).all()


@router.post("/admin/posts/import", response_model=schemas.BulkImportOut, status_code=status.HTTP_201_CREATED)
def bulk_import_posts(
    payload: schemas.BulkImportRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> schemas.BulkImportOut:
    imported_slugs: list[str] = []
    for record in payload.records:
        base_slug = slugify(record.slug or record.title)
        slug = base_slug
        suffix = 2
        while db.query(models.Post).filter(models.Post.slug == slug).first():
            slug = f"{base_slug}-{suffix}"
            suffix += 1
        db.add(
            models.Post(
                title=record.title,
                slug=slug,
                type="analysis",
                category=record.category,
                excerpt=record.excerpt,
                content_html=record.content_html,
                status="draft",
                is_published=False,
            )
        )
        imported_slugs.append(slug)
    db.commit()
    return schemas.BulkImportOut(imported=len(imported_slugs), slugs=imported_slugs)
