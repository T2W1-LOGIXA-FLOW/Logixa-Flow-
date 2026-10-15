from __future__ import annotations

from ..config import ai_enabled_for_role, validate_env


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

def test_ai_feature_gates_default_to_public_off_and_admin_on(monkeypatch):
    monkeypatch.delenv("USER_AI_ENABLED", raising=False)
    monkeypatch.delenv("ADMIN_AI_ENABLED", raising=False)

    assert ai_enabled_for_role("user") is False
    assert ai_enabled_for_role("admin") is True


def test_ai_feature_gates_are_independently_configurable(monkeypatch):
    monkeypatch.setenv("USER_AI_ENABLED", "true")
    monkeypatch.setenv("ADMIN_AI_ENABLED", "false")

    assert ai_enabled_for_role("user") is True
    assert ai_enabled_for_role("admin") is False


def test_ai_provider_configured_only_accepts_openrouter_free_route(monkeypatch):
    from ..config import ai_provider_configured

    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("USER_OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("ADMIN_OPENROUTER_API_KEY", raising=False)
    monkeypatch.setenv("GEMINI_API_KEY", "legacy-gemini-key")
    monkeypatch.setenv("ADMIN_MISTRAL_API_KEY", "legacy-mistral-key")

    assert ai_provider_configured() is False
    assert ai_provider_configured("admin") is False

    monkeypatch.setenv("ADMIN_OPENROUTER_API_KEY", "openrouter-key")
    assert ai_provider_configured() is True
    assert ai_provider_configured("admin") is True
    assert ai_provider_configured("user") is False


def test_require_ai_key_requires_openrouter_not_legacy_paid_provider(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("REQUIRE_AI_KEY", "true")
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("USER_OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("ADMIN_OPENROUTER_API_KEY", raising=False)
    monkeypatch.setenv("GEMINI_API_KEY", "legacy-gemini-key")
    monkeypatch.setenv("JWT_SECRET", "valid-test-jwt-secret")

    missing = validate_env()

    assert any("OPENROUTER_API_KEY" in item for item in missing)
