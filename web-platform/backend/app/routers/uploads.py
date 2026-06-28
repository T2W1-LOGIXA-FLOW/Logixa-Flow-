from __future__ import annotations

import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from .. import schemas
from ..security import require_admin

router = APIRouter()
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
ALLOWED_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}


@router.post("/uploads", response_model=schemas.UploadOut, status_code=status.HTTP_201_CREATED)
def upload_image(file: UploadFile = File(...), _=Depends(require_admin)):
    extension = ALLOWED_TYPES.get(file.content_type or "")
    if not extension:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image uploads are allowed")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{extension}"
    destination = UPLOAD_DIR / filename
    with destination.open("wb") as handle:
        shutil.copyfileobj(file.file, handle)
    return schemas.UploadOut(url=f"/uploads/{filename}")
