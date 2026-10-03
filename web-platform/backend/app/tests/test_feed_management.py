import pytest
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from ..main import app
from ..database import SessionLocal, Base, engine
from .. import models
from .. import security


@pytest.fixture
def db():
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(monkeypatch):
    """Use a verified Supabase admin identity without external auth credentials."""
    monkeypatch.setattr(
        security,
        "_verify_supabase_token",
        lambda token: {"sub": "test-admin-id", "email": "admin@example.com", "role": "admin"},
    )
    return TestClient(app)


@pytest.fixture
def auth_headers():
    """Use a test-only bearer token handled by the mocked Supabase verifier."""
    return {"Authorization": "Bearer " + "unit-test-" + "credential"}

def test_list_feeds_empty(client, db, auth_headers):
    """Test listing feeds when none exist."""
    response = client.get("/api/admin/integration/feeds", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "feeds" in data
    assert data["feeds"] == []


def test_add_feed(client, db, auth_headers):
    """Test adding a new feed."""
    payload = {
        "url": "https://example.com/rss",
        "title": "Example Feed",
        "category": "Supply Chain",
        "trust_level": "standard",
    }
    response = client.post("/api/admin/integration/feeds", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["url"] == payload["url"]
    assert data["title"] == payload["title"]
    assert "id" in data


def test_add_feed_missing_url(client, db, auth_headers):
    """Test adding a feed without URL."""
    payload = {
        "title": "Example Feed",
        "category": "Supply Chain",
    }
    response = client.post("/api/admin/integration/feeds", json=payload, headers=auth_headers)
    assert response.status_code == 400


def test_add_duplicate_feed(client, db, auth_headers):
    """Test adding a duplicate feed URL."""
    payload = {
        "url": "https://example.com/rss",
        "title": "Example Feed",
        "category": "Supply Chain",
        "trust_level": "standard",
    }
    # Add first feed
    response1 = client.post("/api/admin/integration/feeds", json=payload, headers=auth_headers)
    assert response1.status_code == 200
    
    # Try to add duplicate
    response2 = client.post("/api/admin/integration/feeds", json=payload, headers=auth_headers)
    assert response2.status_code == 409


def test_delete_feed(client, db, auth_headers):
    """Test deleting a feed."""
    # Add a feed first
    payload = {
        "url": "https://example.com/rss",
        "title": "Example Feed",
        "category": "Supply Chain",
        "trust_level": "standard",
    }
    add_response = client.post("/api/admin/integration/feeds", json=payload, headers=auth_headers)
    feed_id = add_response.json()["id"]
    
    # Delete the feed
    delete_response = client.delete(f"/api/admin/integration/feeds/{feed_id}", headers=auth_headers)
    assert delete_response.status_code == 200
    
    # Verify it's deleted
    list_response = client.get("/api/admin/integration/feeds", headers=auth_headers)
    assert list_response.status_code == 200
    assert len(list_response.json()["feeds"]) == 0


def test_update_feed(client, db, auth_headers):
    """Test updating a feed."""
    # Add a feed first
    payload = {
        "url": "https://example.com/rss",
        "title": "Example Feed",
        "category": "Supply Chain",
        "trust_level": "standard",
    }
    add_response = client.post("/api/admin/integration/feeds", json=payload, headers=auth_headers)
    feed_id = add_response.json()["id"]
    
    # Update the feed
    update_payload = {
        "title": "Updated Feed",
        "trust_level": "verified",
    }
    update_response = client.patch(f"/api/admin/integration/feeds/{feed_id}", json=update_payload, headers=auth_headers)
    assert update_response.status_code == 200
    data = update_response.json()
    assert data["title"] == "Updated Feed"
    assert data["trust_level"] == "verified"


def test_get_feeds_status(client, db, auth_headers):
    """Test getting feeds status."""
    # Add a feed first
    payload = {
        "url": "https://example.com/rss",
        "title": "Example Feed",
        "category": "Supply Chain",
        "trust_level": "standard",
    }
    client.post("/api/admin/integration/feeds", json=payload, headers=auth_headers)
    
    # Get status
    response = client.get("/api/admin/integration/feeds/status", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "feeds" in data
    assert len(data["feeds"]) == 1
    assert data["feeds"][0]["last_scrape_status"] == "idle"


def test_intelligence_source_trust_score(db):
    """Test that IntelligenceSource has trust_score field."""
    source = models.IntelligenceSource(
        title="Test Source",
        url="https://example.com",
        source_type="rss",
        category="Supply Chain",
        trust_level="standard",
        trust_score=0.75,
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    
    assert source.trust_score == 0.75


def test_feed_source_model(db):
    """Test FeedSource model creation."""
    feed = models.FeedSource(
        url="https://example.com/rss",
        title="Example Feed",
        category="Supply Chain",
        trust_level="standard",
        is_active=True,
    )
    db.add(feed)
    db.commit()
    db.refresh(feed)
    
    assert feed.id is not None
    assert feed.url == "https://example.com/rss"
    assert feed.title == "Example Feed"
    assert feed.is_active is True
    assert feed.last_scrape_status == "idle"
    assert feed.scrape_count == 0
