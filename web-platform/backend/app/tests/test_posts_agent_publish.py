from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from .. import models, security, schemas
from ..database import Base, get_db
from ..main import app
from ..routers import agent as agent_router
from ..routers.agent import publish_memory
from ..schemas import PostCreate


@pytest.fixture()
def posts_client(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)

    def override_db():
        with session_factory() as session:
            yield session

    monkeypatch.setenv("AGENT_SERVICE_TOKEN", "test-agent-token")
    app.dependency_overrides[get_db] = override_db
    try:
        yield TestClient(app), session_factory
    finally:
        app.dependency_overrides.pop(get_db, None)
        Base.metadata.drop_all(engine)
        engine.dispose()


def post_payload(slug: str, **overrides):
    return {
        "title": "A sufficiently long test post",
        "slug": slug,
        "type": "analysis",
        "category": "Supply Chain",
        "excerpt": "Test excerpt",
        "content_html": "<p>Content long enough for post validation.</p>",
        **overrides,
    }


def test_post_creation_schema_defaults_to_draft_and_unpublished():
    post = PostCreate(**post_payload("schema-defaults"))

    assert post.status == "draft"
    assert post.is_published is False


def test_human_admin_can_still_create_published_post(posts_client):
    client, session_factory = posts_client
    app.dependency_overrides[security.require_admin_or_agent_service] = lambda: {
        "sub": "admin-user",
        "role": "admin",
    }
    try:
        response = client.post("/api/posts", json=post_payload(
            "human-published",
            status="published",
        ))
    finally:
        app.dependency_overrides.pop(security.require_admin_or_agent_service, None)

    assert response.status_code == 201
    with session_factory() as session:
        post = session.query(models.Post).filter_by(slug="human-published").one()
        assert post.status == "published"
        assert post.is_published is True


def test_agent_service_cannot_publish_explicitly(posts_client):
    client, session_factory = posts_client
    response = client.post(
        "/api/posts",
        headers={"X-Agent-Service-Token": "test-agent-token"},
        json=post_payload(
            "agent-explicit-publish",
            status="published",
            is_published=True,
        ),
    )

    assert response.status_code == 201
    with session_factory() as session:
        post = session.query(models.Post).filter_by(slug="agent-explicit-publish").one()
        assert post.status == "draft"
        assert post.is_published is False


def test_agent_service_cannot_publish_when_status_is_omitted(posts_client):
    client, session_factory = posts_client
    response = client.post(
        "/api/posts",
        headers={"X-Agent-Service-Token": "test-agent-token"},
        json=post_payload(
            "agent-default-status",
            is_published=True,
        ),
    )

    assert response.status_code == 201
    with session_factory() as session:
        post = session.query(models.Post).filter_by(slug="agent-default-status").one()
        assert post.status == "draft"
        assert post.is_published is False



def test_brain_publish_is_idempotent_for_repeated_publish():
    # Kept as a direct router-level invariant; the fixture below is created locally.
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool
    from ..database import Base

    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        memory = models.AiMemoryBrain(
            category="Supply Chain",
            source_title="Idempotent publish",
            source_url="https://example.com/source",
            prompt="test",
            content="<p>Publish once.</p>",
            summary="Publish once.",
            status="approved",
            is_public=False,
        )
        session.add(memory)
        session.commit()
        session.refresh(memory)

        first = publish_memory(memory.id, schemas.BrainPublishRequest(publish_now=True), db=session, admin={"sub": "admin-user", "role": "admin"})
        session.expire_all()
        second = publish_memory(memory.id, schemas.BrainPublishRequest(publish_now=True), db=session, admin={"sub": "admin-user", "role": "admin"})
        assert first.id == second.id
        assert session.query(models.Post).count() == 1
        assert session.query(models.AiMemoryBrain).one().status == "published"
    finally:
        session.close()
        Base.metadata.drop_all(engine)
        engine.dispose()


def test_brain_publish_requires_approval_before_publication():
    from fastapi import HTTPException
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool
    from ..database import Base

    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        memory = models.AiMemoryBrain(
            category="Supply Chain", source_title="Pending publish", source_url="https://example.com/source",
            prompt="test", content="<p>Draft.</p>", summary="Draft.", status="pending", is_public=False,
        )
        session.add(memory)
        session.commit()
        session.refresh(memory)
        with pytest.raises(HTTPException) as exc:
            publish_memory(memory.id, schemas.BrainPublishRequest(publish_now=True), db=session, admin={"sub": "admin-user", "role": "admin"})
        assert exc.value.status_code == 409
        assert session.query(models.Post).count() == 0
    finally:
        session.close()
        Base.metadata.drop_all(engine)
        engine.dispose()



def test_agent_brain_review_publish_and_unpublish_api_journey(posts_client, monkeypatch):
    client, session_factory = posts_client

    def fake_content_graph(db, run, message, sources):
        return SimpleNamespace(
            final={
                "title": "Release-gate integration test insight",
                "excerpt": "A local integration test for the private review-to-publish journey.",
                "content_html": "<p>Local test content; never sent to production.</p>",
                "model": "test-model",
                "fact_check": {"verdict": "pass"},
                "quality_gate": {"verdict": "pass"},
            },
            providers=["test"],
            total_tokens=12,
        )

    monkeypatch.setattr(agent_router, "execute_content_graph", fake_content_graph)
    app.dependency_overrides[security.require_admin] = lambda: {
        "sub": "release-test-admin",
        "role": "admin",
    }
    try:
        run_response = client.post(
            "/api/agent/run",
            json={"message": "Create a local release-gate test insight", "source_ids": []},
        )
        assert run_response.status_code == 201, run_response.text
        run_payload = run_response.json()
        assert run_payload["status"] == "completed"
        assert run_payload["memory"]["status"] == "pending"
        assert run_payload["memory"]["is_public"] is False
        memory_id = run_payload["memory"]["id"]

        approve_response = client.patch(f"/api/admin/brain/{memory_id}/approve")
        assert approve_response.status_code == 200, approve_response.text
        assert approve_response.json()["status"] == "approved"
        assert approve_response.json()["is_public"] is False

        publish_response = client.patch(
            f"/api/admin/brain/{memory_id}/publish",
            json={"publish_now": True},
        )
        assert publish_response.status_code == 200, publish_response.text
        published_post = publish_response.json()
        assert published_post["status"] == "published"
        assert published_post["is_published"] is True

        with session_factory() as session:
            memory = session.query(models.AiMemoryBrain).filter_by(id=memory_id).one()
            post = session.query(models.Post).filter_by(slug=memory.post_slug).one()
            assert memory.status == "published"
            assert memory.is_public is True
            assert post.is_published is True

        unpublish_response = client.patch(f"/api/admin/brain/{memory_id}/unpublish")
        assert unpublish_response.status_code == 200, unpublish_response.text
        assert unpublish_response.json()["status"] == "approved"
        assert unpublish_response.json()["is_public"] is False
        with session_factory() as session:
            post = session.query(models.Post).filter_by(slug=published_post["slug"]).one()
            assert post.status == "draft"
            assert post.is_published is False
    finally:
        app.dependency_overrides.pop(security.require_admin, None)
