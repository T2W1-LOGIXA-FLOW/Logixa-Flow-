from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from .. import security
from ..main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_auth_me_returns_identity_from_verified_supabase_user(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[dict[str, object]] = []

    def verify_request(url: str, *, headers: dict[str, str], timeout: int):
        calls.append({"url": url, "headers": headers, "timeout": timeout})
        return SimpleNamespace(
            status_code=200,
            json=lambda: {
                "id": "verified-admin-id",
                "email": "admin@example.com",
                "app_metadata": {"role": "admin"},
                "user_metadata": {"role": "user"},
            },
        )

    monkeypatch.setattr(security, "SUPABASE_URL", "https://auth.example.test")
    monkeypatch.setattr(security, "SUPABASE_PUBLISHABLE_KEY", "test-publishable-key")
    monkeypatch.setattr(security.requests, "get", verify_request)

    response = client.get("/api/auth/me", headers={"Authorization": "Bearer " + "supabase-" + "access"})

    assert response.status_code == 200
    assert response.json() == {"username": "admin@example.com", "role": "admin"}
    assert calls[0]["url"] == "https://auth.example.test/auth/v1/user"
    assert calls[0]["headers"]["Authorization"] == "Bearer " + "supabase-" + "access"
    assert calls[0]["headers"]["apikey"] == "test-publishable-key"


def test_auth_me_rejects_missing_bearer_token(client: TestClient) -> None:
    response = client.get("/api/auth/me")

    assert response.status_code == 401


@pytest.mark.parametrize("status_code", [401, 403])
def test_auth_me_rejects_invalid_expired_or_non_admin_tokens(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    status_code: int,
) -> None:
    monkeypatch.setattr(security, "SUPABASE_URL", "https://auth.example.test")
    monkeypatch.setattr(security, "SUPABASE_PUBLISHABLE_KEY", "test-publishable-key")
    monkeypatch.setattr(
        security.requests,
        "get",
        lambda *args, **kwargs: SimpleNamespace(
            status_code=401 if status_code == 401 else 200,
            json=lambda: {"app_metadata": {"role": "user"}},
        ),
    )

    response = client.get("/api/auth/me", headers={"Authorization": "Bearer " + "invalid-" + "credential"})

    assert response.status_code == status_code


def test_agent_service_token_is_not_a_human_supabase_bearer(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(security, "SUPABASE_URL", "https://auth.example.test")
    monkeypatch.setattr(security, "SUPABASE_PUBLISHABLE_KEY", "test-publishable-key")
    monkeypatch.setattr(
        security.requests,
        "get",
        lambda *args, **kwargs: SimpleNamespace(status_code=401, json=lambda: {}),
    )

    response = client.get("/api/auth/me", headers={"Authorization": "Bearer " + "agent-service-" + "credential"})

    assert response.status_code == 401
