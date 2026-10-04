from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from .. import models, security
from ..database import Base, get_db
from ..main import app
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
