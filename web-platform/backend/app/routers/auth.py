from __future__ import annotations

from fastapi import APIRouter, Depends

from ..security import require_admin

router = APIRouter()


@router.get("/auth/me")
def me(user=Depends(require_admin)) -> dict[str, str]:
    return {
        "username": user.get("email") or user.get("sub") or "",
        "role": user["role"],
    }
