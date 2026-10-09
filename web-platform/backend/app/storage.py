from __future__ import annotations

import io
import json
import mimetypes
import os
from typing import BinaryIO
from urllib.parse import quote, urlsplit, urlunsplit

import requests

IMAGE_MAX_BYTES = 10 * 1024 * 1024
DOCUMENT_MAX_BYTES = 50 * 1024 * 1024
B2_MAX_BYTES = 5 * 1024 * 1024 * 1024


def _s3_public_base_url(bucket: str) -> str:
    """Return a public object URL prefix, including the bucket for native B2 URLs.

    Backblaze's native download URL format is /file/<bucket>/<key>. Allow
    S3_PUBLIC_BASE_URL to be configured as either the native file host root,
    the /file prefix, or the full bucket prefix. Custom domains are unchanged.
    """
    raw = os.getenv("S3_PUBLIC_BASE_URL", "").strip().rstrip("/")
    if not raw:
        raise RuntimeError("S3_PUBLIC_BASE_URL is required for B2 storage")
    parsed = urlsplit(raw)
    host = (parsed.hostname or "").lower()
    path = parsed.path.rstrip("/")
    if host.endswith(".backblazeb2.com") and not host.startswith("s3.") and path in ("", "/file"):
        path = f"/file/{quote(bucket, safe='')}"
        return urlunsplit((parsed.scheme, parsed.netloc, path, parsed.query, parsed.fragment)).rstrip("/")
    return raw

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
DOCUMENT_TYPES = {
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


def _configured(name: str) -> bool:
    return bool(os.getenv(name, "").strip())


def classify_storage(filename: str, content_type: str, size_bytes: int) -> str:
    content_type = (content_type or "").split(";", 1)[0].strip().lower()
    if size_bytes > B2_MAX_BYTES:
        raise ValueError("File exceeds the 5 GB Backblaze B2 application limit")
    if content_type in IMAGE_TYPES:
        if size_bytes > IMAGE_MAX_BYTES:
            return "b2"
        return "cloudinary"
    if size_bytes <= DOCUMENT_MAX_BYTES:
        return "supabase"
    return "b2"


def _upload_cloudinary(file_obj: BinaryIO, filename: str, content_type: str) -> str:
    import cloudinary
    import cloudinary.uploader

    cloudinary.config(
        cloud_name=os.environ["CLOUDINARY_CLOUD_NAME"],
        api_key=os.environ["CLOUDINARY_API_KEY"],
        api_secret=os.environ["CLOUDINARY_API_SECRET"],
        secure=True,
    )
    file_obj.seek(0)
    result = cloudinary.uploader.upload(
        file_obj,
        resource_type="image",
        public_id=f"logixa/{filename.rsplit('.', 1)[0]}",
        overwrite=False,
        unique_filename=False,
    )
    return str(result["secure_url"])


def _upload_supabase(file_obj: BinaryIO, filename: str, content_type: str) -> str:
    base = os.environ["SUPABASE_URL"].rstrip("/")
    bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "uploads").strip()
    service_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"].strip()
    file_obj.seek(0)
    response = requests.post(
        f"{base}/storage/v1/object/{bucket}/{filename}",
        headers={
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
            "Content-Type": content_type or "application/octet-stream",
            "x-upsert": "false",
        },
        data=file_obj,
        timeout=120,
    )
    response.raise_for_status()
    public_base = os.getenv("SUPABASE_STORAGE_PUBLIC_BASE_URL", "").strip().rstrip("/")
    if public_base:
        return f"{public_base}/{filename}"
    return f"{base}/storage/v1/object/public/{bucket}/{filename}"


def _upload_s3(file_obj: BinaryIO, filename: str, content_type: str) -> str:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError

    required = {
        "S3_ENDPOINT_URL": os.getenv("S3_ENDPOINT_URL"),
        "S3_ACCESS_KEY_ID": os.getenv("S3_ACCESS_KEY_ID"),
        "S3_SECRET_ACCESS_KEY": os.getenv("S3_SECRET_ACCESS_KEY"),
        "S3_BUCKET": os.getenv("S3_BUCKET"),
    }
    if missing := [key for key, value in required.items() if not value]:
        raise RuntimeError(f"missing S3 variables: {', '.join(missing)}")

    client = boto3.client(
        "s3",
        endpoint_url=required["S3_ENDPOINT_URL"],
        aws_access_key_id=required["S3_ACCESS_KEY_ID"],
        aws_secret_access_key=required["S3_SECRET_ACCESS_KEY"],
        region_name=os.getenv("S3_REGION", "auto"),
    )
    file_obj.seek(0)
    try:
        client.upload_fileobj(
            file_obj,
            required["S3_BUCKET"],
            filename,
            ExtraArgs={"ContentType": content_type or "application/octet-stream"},
        )
    except (BotoCoreError, ClientError) as exc:
        raise RuntimeError("S3-compatible storage rejected the upload") from exc

    public_base = _s3_public_base_url(required["S3_BUCKET"])
    return f"{public_base}/{filename}"


def upload_routed(file_obj: BinaryIO, filename: str, content_type: str, size_bytes: int) -> tuple[str, str, str]:
    """Route by file class: images->Cloudinary, documents->Supabase, large->B2.

    The selected backend can fall back to the configured secondary backends, but
    a fallback never changes the persisted storage_class classification.
    """
    storage_class = classify_storage(filename, content_type, size_bytes)
    configured = {
        "cloudinary": ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"),
        "supabase": ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_STORAGE_BUCKET"),
        "b2": ("S3_ENDPOINT_URL", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_BUCKET", "S3_PUBLIC_BASE_URL"),
    }
    preferred = {
        "cloudinary": ["cloudinary", "supabase", "b2"],
        "supabase": ["supabase", "b2"],
        "b2": ["b2"],
    }[storage_class]

    errors: list[str] = []
    for backend in preferred:
        try:
            if not all(_configured(key) for key in configured[backend]):
                raise RuntimeError(f"{backend} is not configured")
            if backend == "cloudinary":
                url = _upload_cloudinary(file_obj, filename, content_type)
            elif backend == "supabase":
                url = _upload_supabase(file_obj, filename, content_type)
            else:
                url = _upload_s3(file_obj, filename, content_type)
            return backend, storage_class, url
        except Exception as exc:
            errors.append(f"{backend}: {exc.__class__.__name__}")
    raise RuntimeError("storage routing failed: " + ", ".join(errors))


def _google_drive_credentials():
    from google.oauth2.credentials import Credentials

    raw = os.getenv("GOOGLE_DRIVE_CREDENTIALS_JSON", "").strip()
    if not raw:
        raise RuntimeError("GOOGLE_DRIVE_CREDENTIALS_JSON is required for Google Drive exports")
    data = json.loads(raw)
    return Credentials.from_authorized_user_info(
        data,
        scopes=["https://www.googleapis.com/auth/drive.file"],
    )


def export_to_google_drive(file_obj: BinaryIO, filename: str, content_type: str) -> str:
    """Upload an export using the configured user's Google Drive OAuth credentials."""
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseUpload

    credentials = _google_drive_credentials()
    service = build("drive", "v3", credentials=credentials, cache_discovery=False)
    folder_id = os.getenv("GOOGLE_DRIVE_EXPORT_FOLDER_ID", "").strip()
    metadata = {"name": filename}
    if folder_id:
        metadata["parents"] = [folder_id]
    file_obj.seek(0)
    media = MediaIoBaseUpload(
        file_obj,
        mimetype=content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream",
        resumable=True,
    )
    created = service.files().create(body=metadata, media_body=media, fields="id,webViewLink").execute()
    return str(created.get("webViewLink") or f"https://drive.google.com/open?id={created['id']}")
