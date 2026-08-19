from __future__ import annotations

import os
import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from .. import schemas
from ..security import require_admin

try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
except ImportError:  # pragma: no cover - exercised only when optional storage dependency is missing
    boto3 = None
    BotoCoreError = ClientError = Exception

router = APIRouter()
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
ALLOWED_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}


def _storage_backend() -> str:
    return os.getenv("UPLOAD_STORAGE_BACKEND", os.getenv("STORAGE_BACKEND", "local")).strip().lower()


def _public_url(filename: str) -> str:
    public_base = os.getenv("S3_PUBLIC_BASE_URL") or os.getenv("UPLOAD_PUBLIC_BASE_URL")
    if public_base:
        return f"{public_base.rstrip('/')}/{filename}"
    if _storage_backend() in {"b2", "r2", "s3"}:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="S3_PUBLIC_BASE_URL is required when using B2, R2, or S3 uploads",
        )
    return f"/uploads/{filename}"


def _upload_to_s3(file: UploadFile, filename: str) -> str:
    if boto3 is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="boto3 is required for B2, R2, or S3 uploads",
        )

    required = {
        "S3_ENDPOINT_URL": os.getenv("S3_ENDPOINT_URL"),
        "S3_ACCESS_KEY_ID": os.getenv("S3_ACCESS_KEY_ID"),
        "S3_SECRET_ACCESS_KEY": os.getenv("S3_SECRET_ACCESS_KEY"),
        "S3_BUCKET": os.getenv("S3_BUCKET"),
    }
    if missing := [key for key, value in required.items() if not value]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload storage is missing required variables: {', '.join(missing)}",
        )

    client = boto3.client(
        "s3",
        endpoint_url=required["S3_ENDPOINT_URL"],
        aws_access_key_id=required["S3_ACCESS_KEY_ID"],
        aws_secret_access_key=required["S3_SECRET_ACCESS_KEY"],
        region_name=os.getenv("S3_REGION", "auto"),
    )
    try:
        file.file.seek(0)
        client.upload_fileobj(
            file.file,
            required["S3_BUCKET"],
            filename,
            ExtraArgs={"ContentType": file.content_type or "application/octet-stream"},
        )
    except (BotoCoreError, ClientError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Upload storage rejected the file",
        ) from exc
    return _public_url(filename)


@router.post("/uploads", response_model=schemas.UploadOut, status_code=status.HTTP_201_CREATED)
def upload_image(file: UploadFile = File(...), _=Depends(require_admin)):
    extension = ALLOWED_TYPES.get(file.content_type or "")
    if not extension:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image uploads are allowed")

    filename = f"{uuid4().hex}{extension}"
    if _storage_backend() in {"b2", "r2", "s3"}:
        return schemas.UploadOut(url=_upload_to_s3(file, filename))

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    destination = UPLOAD_DIR / filename
    with destination.open("wb") as handle:
        shutil.copyfileobj(file.file, handle)
    return schemas.UploadOut(url=_public_url(filename))
