from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from pathlib import Path
from typing import Any

import requests
from fastapi import Header, HTTPException, status
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def _get_jwt_secret() -> str:
    """Get the legacy custom JWT secret used only by compatibility helpers."""
    secret = os.getenv("JWT_SECRET", os.getenv("API_SECRET_TOKEN", "change-me-in-production"))
    is_production = os.getenv("ENVIRONMENT", "development").lower() in {"production", "prod"}

    if is_production and secret in {"change-me-in-production", "", None}:
        raise ValueError(
            "CRITICAL: JWT_SECRET or API_SECRET_TOKEN must be set in production environments."
        )

    return secret


JWT_SECRET = _get_jwt_secret()
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")


def _b64encode(payload: bytes) -> str:
    return base64.urlsafe_b64encode(payload).rstrip(b"=").decode("ascii")


def _b64decode(payload: str) -> bytes:
    padding = "=" * (-len(payload) % 4)
    return base64.urlsafe_b64decode(payload + padding)


def create_access_token(username: str, role: str = "admin", expires_in: int = 60 * 60 * 12) -> str:
    """Legacy token helper retained for compatibility/tests; admin API auth uses Supabase tokens."""
    header = {"alg": "HS256", "typ": "JWT"}
    body = {"sub": username, "role": role, "exp": int(time.time()) + expires_in}
    signing_input = f"{_b64encode(json.dumps(header).encode())}.{_b64encode(json.dumps(body).encode())}"
    signature = hmac.new(JWT_SECRET.encode("utf-8"), signing_input.encode("ascii"), hashlib.sha256).digest()
    return f"{signing_input}.{_b64encode(signature)}"


def decode_token(token: str) -> dict[str, Any]:
    """Legacy custom JWT decoder retained for non-admin compatibility code/tests."""
    try:
        header_part, body_part, signature_part = token.split(".")
        signing_input = f"{header_part}.{body_part}"
        expected = hmac.new(JWT_SECRET.encode("utf-8"), signing_input.encode("ascii"), hashlib.sha256).digest()
        if not hmac.compare_digest(_b64encode(expected), signature_part):
            raise ValueError("Invalid signature")
        body = json.loads(_b64decode(body_part))
        if int(body.get("exp", 0)) < int(time.time()):
            raise ValueError("Expired token")
        return body
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc


def _verify_supabase_token(token: str) -> dict[str, Any]:
    if not SUPABASE_URL or not SUPABASE_PUBLISHABLE_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is not configured",
        )

    try:
        response = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": SUPABASE_PUBLISHABLE_KEY,
                "Authorization": f"Bearer {token}",
            },
            timeout=5,
        )
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
        ) from exc

    if response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")

    try:
        user = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication response") from exc

    app_metadata = user.get("app_metadata") or {}
    if app_metadata.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")

    return {
        "sub": user.get("id"),
        "email": user.get("email"),
        "role": "admin",
    }


def verify_service_token(token: str) -> dict[str, Any]:
    """Verify the dedicated agent service token using constant-time comparison."""
    expected = os.getenv("AGENT_SERVICE_TOKEN", "").strip()
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service authentication is not configured",
        )
    if not hmac.compare_digest(expected, token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid service token",
        )
    return {"sub": "agent-service", "role": "service", "scopes": ["ingest", "sync"]}


def require_admin_or_service(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    """Allow Supabase admins or the narrowly scoped background-agent token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    try:
        return _verify_supabase_token(token)
    except HTTPException as supabase_error:
        if supabase_error.status_code not in {401, 403}:
            raise
        return verify_service_token(token)


def require_admin(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    """Verify an admin session issued by Supabase Auth."""

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    return _verify_supabase_token(token)


class CurrentUser:
    """User object from the legacy custom JWT token."""

    def __init__(self, token_payload: dict[str, Any]):
        self.username = token_payload.get("sub", "anonymous")
        self.role = token_payload.get("role", "user")
        try:
            if self.username.startswith("user_"):
                self.id = int(self.username.split("_")[1])
            else:
                self.id = int(self.username) if self.username.isdigit() else hash(self.username) % (10 ** 8)
        except (ValueError, AttributeError):
            self.id = hash(self.username) % (10 ** 8)
        self.token_payload = token_payload


def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    """Legacy custom JWT dependency retained for compatibility with existing non-admin flows."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    payload = decode_token(authorization.removeprefix("Bearer ").strip())
    return CurrentUser(payload)
