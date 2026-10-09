from __future__ import annotations

import json

import pytest
from google.oauth2.credentials import Credentials

from app import storage


def _credential_json(**overrides: object) -> str:
    data: dict[str, object] = {
        "token": "access-token",
        "refresh_token": "refresh-token",
        "token_uri": "https://oauth2.googleapis.com/token",
        "client_id": "client-id",
        "client_secret": "client-secret",
    }
    data.update(overrides)
    return json.dumps(data)


def test_google_drive_credentials_do_not_invent_scope_when_token_omits_it(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, object] = {}

    def fake_from_authorized_user_info(data: dict[str, object], scopes: list[str] | None = None):
        captured["data"] = data
        captured["scopes"] = scopes
        return object()

    monkeypatch.setenv("GOOGLE_DRIVE_CREDENTIALS_JSON", _credential_json())
    monkeypatch.setattr(Credentials, "from_authorized_user_info", staticmethod(fake_from_authorized_user_info))

    assert storage._google_drive_credentials() is not None
    assert captured["scopes"] is None


def test_google_drive_credentials_preserve_recorded_write_scope(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, object] = {}

    def fake_from_authorized_user_info(data: dict[str, object], scopes: list[str] | None = None):
        captured["scopes"] = scopes
        return object()

    monkeypatch.setenv(
        "GOOGLE_DRIVE_CREDENTIALS_JSON",
        _credential_json(scopes=["https://www.googleapis.com/auth/drive.file"]),
    )
    monkeypatch.setattr(Credentials, "from_authorized_user_info", staticmethod(fake_from_authorized_user_info))

    storage._google_drive_credentials()
    assert captured["scopes"] == ["https://www.googleapis.com/auth/drive.file"]


def test_google_drive_credentials_reject_read_only_scope(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(
        "GOOGLE_DRIVE_CREDENTIALS_JSON",
        _credential_json(scopes=["https://www.googleapis.com/auth/drive.readonly"]),
    )

    with pytest.raises(RuntimeError, match="lack a supported write scope"):
        storage._google_drive_credentials()


def test_google_drive_credentials_reject_invalid_json(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GOOGLE_DRIVE_CREDENTIALS_JSON", "{not-json")

    with pytest.raises(RuntimeError, match="valid authorized-user OAuth JSON"):
        storage._google_drive_credentials()
