from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from pathlib import Path
from typing import Any

from fastapi import Header, HTTPException, status
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

def _get_jwt_secret() -> str:
    """Get JWT secret from environment, with production safety check."""
    secret = os.getenv("JWT_SECRET", os.getenv("API_SECRET_TOKEN", "change-me-in-production"))
    is_production = os.getenv("ENVIRONMENT", "development").lower() in {"production", "prod"}
    
    if is_production and secret in {"change-me-in-production", "", None}:
        raise ValueError(
            "CRITICAL: JWT_SECRET or API_SECRET_TOKEN must be set in production. "
            "Using default secrets is not allowed in production environments."
        )
    
    return secret

JWT_SECRET = _get_jwt_secret()
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")


def _b64encode(payload: bytes) -> str:
    return base64.urlsafe_b64encode(payload).rstrip(b"=").decode("ascii")


def _b64decode(payload: str) -> bytes:
    padding = "=" * (-len(payload) % 4)
    return base64.urlsafe_b64decode(payload + padding)


def create_access_token(username: str, role: str = "admin", expires_in: int = 60 * 60 * 12) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    body = {"sub": username, "role": role, "exp": int(time.time()) + expires_in}
    signing_input = f"{_b64encode(json.dumps(header).encode())}.{_b64encode(json.dumps(body).encode())}"
    signature = hmac.new(JWT_SECRET.encode("utf-8"), signing_input.encode("ascii"), hashlib.sha256).digest()
    return f"{signing_input}.{_b64encode(signature)}"


def decode_token(token: str) -> dict[str, Any]:
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


def authenticate_admin(username: str, password: str) -> bool:
    if not ADMIN_PASSWORD:
        return False
    return hmac.compare_digest(username, ADMIN_USERNAME) and hmac.compare_digest(password, ADMIN_PASSWORD)


def require_admin(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    payload = decode_token(authorization.removeprefix("Bearer ").strip())
    if payload.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return payload


class CurrentUser:
    """User object from JWT token with id extracted from 'sub' claim."""
    def __init__(self, token_payload: dict[str, Any]):
        self.username = token_payload.get("sub", "anonymous")
        self.role = token_payload.get("role", "user")
        # Extract user ID from username (format: "user_{id}" or just numeric)
        try:
            if self.username.startswith("user_"):
                self.id = int(self.username.split("_")[1])
            else:
                self.id = int(self.username) if self.username.isdigit() else hash(self.username) % (10 ** 8)
        except (ValueError, AttributeError):
            self.id = hash(self.username) % (10 ** 8)
        self.token_payload = token_payload


def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    """Extract authenticated user from JWT token. Requires valid token but not admin role."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    payload = decode_token(authorization.removeprefix("Bearer ").strip())
    return CurrentUser(payload)
