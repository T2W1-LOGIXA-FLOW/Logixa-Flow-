from __future__ import annotations

from ..config import validate_env


def set_required_secrets(monkeypatch, jwt_secret: str, api_secret: str) -> None:
    monkeypatch.setenv("JWT_SECRET", jwt_secret)
    monkeypatch.setenv("API_SECRET_TOKEN", api_secret)
    monkeypatch.setenv("ADMIN_PASSWORD", "test-admin-password")


def test_production_rejects_placeholder_secrets(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    set_required_secrets(
        monkeypatch,
        "change-me-in-production",
        "change-this-before-public-deploy",
    )

    missing = validate_env()

    assert any(item.startswith("JWT_SECRET") for item in missing)
    assert any(item.startswith("API_SECRET_TOKEN") for item in missing)


def test_production_rejects_secrets_shorter_than_32_characters(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    set_required_secrets(monkeypatch, "j" * 31, "a" * 31)

    missing = validate_env()

    assert any(item.startswith("JWT_SECRET") for item in missing)
    assert any(item.startswith("API_SECRET_TOKEN") for item in missing)


def test_production_accepts_non_placeholder_secrets_at_least_32_characters(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    set_required_secrets(monkeypatch, "j" * 32, "a" * 32)

    assert validate_env() == []


def test_development_preserves_existing_secret_validation(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.delenv("API_SECRET_TOKEN", raising=False)
    monkeypatch.setenv("JWT_SECRET", "change-me-in-production")
    monkeypatch.setenv("ADMIN_PASSWORD", "test-admin-password")

    assert validate_env() == []
