from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app import security
from app.database import Base, get_db
from app.main import app


def test_integration_catalog_reports_readiness_without_secret_values(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-secret-value")
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
    app.dependency_overrides[security.require_admin] = lambda: {"sub": "catalog-test-admin", "role": "admin"}
    try:
        response = TestClient(app).get("/api/admin/integrations/catalog")
        assert response.status_code == 200, response.text
        payload = response.json()
        openrouter = next(item for item in payload["items"] if item["id"] == "openrouter")
        telegram = next(item for item in payload["items"] if item["id"] == "telegram")
        assert openrouter["configured"] is True
        assert openrouter["enabled"] is True
        assert telegram["configured"] is False
        assert telegram["enabled"] is False
        assert "test-secret-value" not in response.text
        assert "OPENROUTER_API_KEY" not in response.text
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(security.require_admin, None)
        Base.metadata.drop_all(engine)
        engine.dispose()


def test_integration_catalog_toggle_is_persisted_and_cannot_enable_unconfigured_provider(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-secret-value")
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
    app.dependency_overrides[security.require_admin] = lambda: {"sub": "catalog-test-admin", "role": "admin"}
    try:
        client = TestClient(app)
        disabled = client.patch("/api/admin/integrations/catalog/openrouter", json={"enabled": False})
        assert disabled.status_code == 200, disabled.text
        assert disabled.json()["enabled"] is False

        refreshed = client.get("/api/admin/integrations/catalog")
        assert next(item for item in refreshed.json()["items"] if item["id"] == "openrouter")["enabled"] is False

        rejected = client.patch("/api/admin/integrations/catalog/telegram", json={"enabled": True})
        assert rejected.status_code == 409
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(security.require_admin, None)
        Base.metadata.drop_all(engine)
        engine.dispose()
