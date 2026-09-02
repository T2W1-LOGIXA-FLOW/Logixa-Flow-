from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from .. import models
from ..database import Base
from ..routers.agent import publish_memory, unpublish_memory
from ..schemas import BrainPublishRequest


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


def make_published_pair(db):
    post = models.Post(
        title="Published insight",
        slug="published-insight",
        type="analysis",
        category="Supply Chain",
        excerpt="Published excerpt",
        content_html="<p>Published content that is long enough.</p>",
        is_published=True,
        status="published",
    )
    memory = models.AiMemoryBrain(
        category="Supply Chain",
        source_title="Published insight",
        content="<p>Published content that is long enough.</p>",
        summary="Published summary",
        status="published",
        is_public=True,
        post_slug=post.slug,
    )
    db.add_all([post, memory])
    db.commit()
    db.refresh(memory)
    return memory, post


def test_unpublish_requires_admin_and_preserves_rows(db):
    memory, post = make_published_pair(db)

    updated = unpublish_memory(memory.id, db, {"sub": "admin@example.invalid"})
    db.refresh(post)
    assert updated.id == memory.id
    assert updated.status == "approved"
    assert updated.is_public is False
    assert updated.post_slug == post.slug
    assert post.id is not None
    assert post.is_published is False
    assert post.status == "draft"
    assert post.published_at is None
    assert db.query(models.AiMemoryBrain).count() == 1
    assert db.query(models.Post).count() == 1

    audit = db.query(models.AnalyticsEvent).filter_by(event_type="brain_unpublished").one()
    assert set(__import__("json").loads(audit.details)) == {"actor", "action", "object", "result"}
    assert "Published content" not in audit.details


def test_unpublish_rejects_unlinked_unpublished_and_unrelated_posts(db):
    memory = models.AiMemoryBrain(
        category="Supply Chain",
        source_title="Unlinked",
        content="<p>Unlinked content that is long enough.</p>",
        status="published",
        is_public=True,
    )
    unrelated = models.Post(
        title="Unrelated post",
        slug="unrelated-post",
        type="analysis",
        category="Supply Chain",
        excerpt="Unrelated excerpt",
        content_html="<p>Unrelated content that is long enough.</p>",
        is_published=True,
        status="published",
    )
    db.add_all([memory, unrelated])
    db.commit()
    db.refresh(memory)

    with pytest.raises(HTTPException) as exc:
        unpublish_memory(memory.id, db, {"sub": "admin"})
    assert exc.value.status_code == 404
    assert unrelated.is_published is True

    linked, _ = make_published_pair(db)
    unpublish_memory(linked.id, db, {"sub": "admin"})
    with pytest.raises(HTTPException) as exc:
        unpublish_memory(linked.id, db, {"sub": "admin"})
    assert exc.value.status_code == 404


def test_publish_is_duplicate_safe_and_republishes_existing_link(db):
    memory = models.AiMemoryBrain(
        category="Supply Chain",
        source_title="Draft insight",
        content="<p>Draft content that is long enough.</p>",
        summary="Draft summary",
        status="approved",
        is_public=False,
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)

    first = publish_memory(memory.id, BrainPublishRequest(publish_now=True), db, None, {"sub": "admin"})
    memory_slug = first.slug
    assert db.query(models.Post).count() == 1
    second = publish_memory(memory.id, BrainPublishRequest(publish_now=True), db, None, {"sub": "admin"})
    assert second.id == first.id
    assert db.query(models.Post).count() == 1

    unpublish_memory(memory.id, db, {"sub": "admin"})
    linked_draft = publish_memory(memory.id, BrainPublishRequest(publish_now=False), db, None, {"sub": "admin"})
    assert linked_draft.id == first.id
    assert linked_draft.is_published is False
    assert db.query(models.Post).count() == 1
    republished = publish_memory(memory.id, BrainPublishRequest(publish_now=True), db, None, {"sub": "admin"})
    assert republished.id == first.id
    assert republished.slug == memory_slug
    assert republished.is_published is True
    assert db.query(models.Post).count() == 1

    events = db.query(models.AnalyticsEvent).filter(models.AnalyticsEvent.event_type.in_(["brain_published", "brain_publish_idempotent"])).all()
    assert events
    for event in events:
        details = __import__("json").loads(event.details)
        assert set(details) == {"actor", "action", "object", "result"}
        assert "Draft content" not in event.details


def test_publish_conflict_records_safe_metadata_only_audit(db):
    memory = models.AiMemoryBrain(
        category="Supply Chain",
        source_title="Missing linked post",
        content="<p>Content that must not enter audit details.</p>",
        summary="Safe summary",
        status="approved",
        is_public=False,
        post_slug="missing-linked-post",
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)

    with pytest.raises(HTTPException) as exc:
        publish_memory(memory.id, BrainPublishRequest(publish_now=True), db, None, {"sub": "admin"})

    assert exc.value.status_code == 409
    audit = db.query(models.AnalyticsEvent).filter_by(event_type="brain_publish_conflict").one()
    details = __import__("json").loads(audit.details)
    assert set(details) == {"actor", "action", "object", "result"}
    assert details["action"] == "publish"
    assert details["result"] == "linked_post_unavailable"
    assert str(memory.id) in audit.details
    assert "Content that must not enter audit details" not in audit.details
