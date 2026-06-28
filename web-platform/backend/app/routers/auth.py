from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from .. import schemas
from ..security import authenticate_admin, create_access_token, require_admin

router = APIRouter()


@router.post("/auth/login", response_model=schemas.TokenOut)
def login(payload: schemas.LoginRequest) -> schemas.TokenOut:
    if not authenticate_admin(payload.username, payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    return schemas.TokenOut(access_token=create_access_token(payload.username), role="admin")


@router.get("/auth/me")
def me(user=Depends(require_admin)) -> dict[str, str]:
    return {"username": user["sub"], "role": user["role"]}
