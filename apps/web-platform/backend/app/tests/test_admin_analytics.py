from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import security
from app.database import Base, get_db
from app.main import app


def test_admin_analytics_returns_seven_day_snapshot_from_empty_database(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    def override_db():
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[security.require_admin] = lambda: {
        "sub": "isolated-analytics-test-admin",
        "role": "admin",
    }
    try:
        response = TestClient(app).get("/api/admin/analytics?days=7")
        assert response.status_code == 200, response.text
        payload = response.json()
        assert len(payload) == 7
        assert all(
            row["agent_runs"] == 0
            and row["sources_added"] == 0
            and row["published_posts"] == 0
            and row["pending_approvals"] == 0
            for row in payload
        )
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(security.require_admin, None)
        Base.metadata.drop_all(engine)
        engine.dispose()
