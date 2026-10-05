from __future__ import annotations

import os
import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from .. import schemas
from ..security import require_admin
from ..storage import upload_image

router = APIRouter()
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
ALLOWED_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
MAX_UPLOAD_BYTES = min(max(int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)), 1), 1), 20 * 1024 * 1024)


def _validate_image_upload(file: UploadFile, content: bytes) -> None:
    content_type = file.content_type or ""
    signatures = {
        "image/jpeg": content.startswith(b"\xff\xd8\xff"),
        "image/png": content.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/gif": content.startswith((b"GIF87a", b"GIF89a")),
        "image/webp": len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP",
    }
    if not signatures.get(content_type, False):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file content does not match its image type")


def _storage_backend() -> str:
    return os.getenv("UPLOAD_STORAGE_BACKEND", os.getenv("STORAGE_BACKEND", "local")).strip().lower()


def _public_url(filename: str) -> str:
    return f"/uploads/{filename}"


@router.post("/uploads", response_model=schemas.UploadOut, status_code=status.HTTP_201_CREATED)
def upload_image(file: UploadFile = File(...), _=Depends(require_admin)):
    extension = ALLOWED_TYPES.get(file.content_type or "")
    if not extension:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image uploads are allowed")

    content = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image upload exceeds the configured size limit")
    _validate_image_upload(file, content)
    file.file.seek(0)

    filename = f"{uuid4().hex}{extension}"
    backend = _storage_backend()
    if backend in {"cloudinary", "supabase", "b2", "r2", "s3"}:
        try:
            url = upload_image(file.file, filename, file.content_type or "application/octet-stream")
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Upload storage rejected the file",
            ) from exc
        return schemas.UploadOut(url=url)

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    destination = UPLOAD_DIR / filename
    with destination.open("wb") as handle:
        shutil.copyfileobj(file.file, handle)
    return schemas.UploadOut(url=_public_url(filename))
