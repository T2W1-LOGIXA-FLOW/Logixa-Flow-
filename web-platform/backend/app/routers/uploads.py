from __future__ import annotations

import os
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse

from .. import models, schemas
from ..database import SessionLocal
from ..security import require_admin
from ..storage import B2_MAX_BYTES, IMAGE_TYPES, classify_storage, download_s3_object, upload_routed

router = APIRouter()
ALLOWED_IMAGE_TYPES = IMAGE_TYPES
ALLOWED_DOCUMENT_TYPES = {
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/csv",
    "application/json",
    "application/xml",
    "text/xml",
    "application/zip",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}


def _max_upload_bytes() -> int:
    raw = os.getenv("MAX_UPLOAD_BYTES", str(B2_MAX_BYTES)).strip()
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return B2_MAX_BYTES
    return min(max(value, 1), B2_MAX_BYTES)


def _validate_image_upload(file: UploadFile, content: bytes) -> None:
    content_type = (file.content_type or "").split(";", 1)[0].strip().lower()
    signatures = {
        "image/jpeg": content.startswith(b"\xff\xd8\xff"),
        "image/png": content.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/gif": content.startswith((b"GIF87a", b"GIF89a")),
        "image/webp": len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP",
    }
    if not signatures.get(content_type, False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file content does not match its image type",
        )


def _owner_id(admin: object) -> str | None:
    if isinstance(admin, dict):
        value = admin.get("sub") or admin.get("user_id") or admin.get("id")
        return str(value) if value else None
    return None


@router.post("/uploads", response_model=schemas.UploadOut, status_code=status.HTTP_201_CREATED)
def upload_file(request: Request, file: UploadFile = File(...), _admin=Depends(require_admin)):
    content_type = (file.content_type or "").split(";", 1)[0].strip().lower()
    if content_type not in ALLOWED_IMAGE_TYPES | ALLOWED_DOCUMENT_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type")

    file.file.seek(0, 2)
    size_bytes = file.file.tell()
    file.file.seek(0)
    if size_bytes > _max_upload_bytes():
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds the configured upload size limit",
        )

    if content_type in ALLOWED_IMAGE_TYPES:
        signature = file.file.read(32)
        file.file.seek(0)
        _validate_image_upload(file, signature)

    try:
        classify_storage(file.filename or "upload", content_type, size_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(exc)) from exc

    filename = f"{uuid4().hex}-{Path(file.filename or 'upload').name}"
    record_id = uuid4().hex
    try:
        backend, storage_class, url = upload_routed(file.file, filename, content_type, size_bytes)
        if backend == "b2":
            # Keep B2 private. The opaque app URL streams from B2 using
            # server-side credentials instead of a public URL or expiring link.
            url = str(request.app.url_path_for("download_stored_file", file_id=record_id))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Upload storage rejected the file",
        ) from exc

    record = models.StoredFile(
        id=record_id,
        original_filename=Path(file.filename or "upload").name[:500],
        storage_backend=backend,
        storage_class=storage_class,
        content_type=content_type,
        size_bytes=size_bytes,
        object_key=filename,
        url=url,
        owner_id=_owner_id(_admin),
        is_export=False,
    )
    db = SessionLocal()
    try:
        db.add(record)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="File metadata could not be persisted") from exc
    finally:
        db.close()

    return schemas.UploadOut(url=url)


@router.get("/uploads/files/{file_id}", name="download_stored_file")
def download_stored_file(file_id: str):
    """Serve an opaque-link B2 object without making the B2 bucket public."""
    db = SessionLocal()
    try:
        record = db.query(models.StoredFile).filter(models.StoredFile.id == file_id).first()
        if record is None or record.storage_backend != "b2" or record.is_export:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        object_key = record.object_key
        content_type = record.content_type or "application/octet-stream"
    finally:
        db.close()

    try:
        result = download_s3_object(object_key)
        body = result["Body"]
    except Exception as exc:
        # Do not leak provider credentials, bucket details, or raw provider errors.
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Stored file could not be retrieved") from exc

    def chunks():
        try:
            yield from body.iter_chunks(chunk_size=64 * 1024)
        finally:
            body.close()

    headers = {
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
    }
    # Only known passive media types may render inline on the API origin.
    # Documents/text/XML are forced to download and sandboxed to prevent
    # uploaded active content from executing with the API origin's privileges.
    if content_type not in IMAGE_TYPES and content_type != "application/pdf":
        headers["Content-Disposition"] = "attachment"
        headers["Content-Security-Policy"] = "sandbox"
    if result.get("ContentLength") is not None:
        headers["Content-Length"] = str(result["ContentLength"])
    return StreamingResponse(chunks(), media_type=content_type, headers=headers)


@router.post("/uploads/drive-export", response_model=schemas.UploadOut, status_code=status.HTTP_201_CREATED)
def export_file_to_drive(file: UploadFile = File(...), _admin=Depends(require_admin)):
    content_type = (file.content_type or "").split(";", 1)[0].strip().lower()
    file.file.seek(0, 2)
    size_bytes = file.file.tell()
    file.file.seek(0)
    if size_bytes > B2_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Export exceeds the supported 5 GB limit",
        )

    from ..storage import export_to_google_drive

    try:
        url = export_to_google_drive(file.file, Path(file.filename or "export").name, content_type)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Google Drive export is not configured or failed",
        ) from exc

    record = models.StoredFile(
        id=uuid4().hex,
        original_filename=Path(file.filename or "export").name[:500],
        storage_backend="google_drive",
        storage_class="export",
        content_type=content_type or "application/octet-stream",
        size_bytes=size_bytes,
        object_key=url,
        url=url,
        owner_id=_owner_id(_admin),
        is_export=True,
    )
    db = SessionLocal()
    try:
        db.add(record)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Export metadata could not be persisted") from exc
    finally:
        db.close()

    return schemas.UploadOut(url=url)
