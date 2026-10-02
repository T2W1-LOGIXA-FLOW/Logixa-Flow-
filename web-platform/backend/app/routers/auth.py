from __future__ import annotations

from fastapi import APIRouter, Depends

from .. import schemas
from ..security import require_admin

router = APIRouter()


@router.post("/auth/login", response_model=schemas.TokenOut, deprecated=True)
def login_legacy(payload: schemas.LoginRequest) -> schemas.TokenOut:
    """Compatibility login for an existing admin password during Auth migration."""
    if not authenticate_admin(payload.username, payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    return schemas.TokenOut(
        access_token=create_access_token(payload.username, role="admin"),
        role="admin",
    )


@router.get("/auth/me")
def me(user=Depends(require_admin)) -> dict[str, str]:
    return {
        "username": user.get("email") or user.get("sub") or "",
        "role": user["role"],
    }
