from __future__ import annotations

from fastapi import APIRouter, Depends

from .. import schemas
from ..security import require_admin

router = APIRouter()


@router.post("/auth/login", deprecated=True)
def login_legacy() -> dict[str, str]:
    return {
        "detail": "Admin login moved to Supabase Auth. Use the Supabase session access token."
    }


@router.get("/auth/me")
def me(user=Depends(require_admin)) -> dict[str, str]:
    return {
        "username": user.get("email") or user.get("sub") or "",
        "role": user["role"],
    }
