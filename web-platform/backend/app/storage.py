from __future__ import annotations

import io
import json
import mimetypes
import os
import re
from typing import BinaryIO
from urllib.parse import quote, urlsplit, urlunsplit

import requests

IMAGE_MAX_BYTES = 10 * 1024 * 1024
DOCUMENT_MAX_BYTES = 50 * 1024 * 1024
B2_MAX_BYTES = 5 * 1024 * 1024 * 1024


def _s3_public_base_url(bucket: str) -> str:
    """Build a public B2 URL from a native download host, S3 endpoint, or custom base.

    Backblaze supports native URLs at /file/<bucket>/<key> and virtual-hosted
    S3 URLs at https://<bucket>.s3.<region>.backblazeb2.com/<key>.
    """
    raw = os.getenv("S3_PUBLIC_BASE_URL", "").strip().rstrip("/")
    if not raw:
        raise RuntimeError("S3_PUBLIC_BASE_URL is required for B2 storage")
    parsed = urlsplit(raw)
    host = (parsed.hostname or "").lower()
    path = parsed.path.rstrip("/")
    bucket_host = quote(bucket, safe="")

    # S3 API endpoint accidentally supplied as the public base: switch to the
    # supported virtual-hosted public object URL and remove a duplicate bucket path.
    if host.startswith("s3.") and host.endswith(".backblazeb2.com") and path in ("", f"/{bucket}"):
        netloc = f"{bucket_host}.{parsed.netloc}"
        return urlunsplit((parsed.scheme, netloc, "", "", "")).rstrip("/")

    # A bucket-specific S3 public host is already correct.
    if host.startswith(f"{bucket.lower()}.s3.") and host.endswith(".backblazeb2.com"):
        return raw

    # Native B2 download host requires /file/<bucket> before the object key.
    if host.startswith("f") and host.endswith(".backblazeb2.com") and path in ("", "/file"):
        path = f"/file/{bucket_host}"
        return urlunsplit((parsed.scheme, parsed.netloc, path, "", "")).rstrip("/")

    # A custom CDN/domain is treated as an already configured public prefix.
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


def _s3_signing_region(endpoint_url: str, configured_region: str | None = None) -> str:
    """Use the region embedded in a regional Backblaze S3 endpoint for SigV4.

    B2 endpoints are region-specific; signing with the generic "auto" default
    can make requests fail even when the endpoint and credentials are otherwise
    valid. Keep the explicit region setting for non-Backblaze S3-compatible hosts.
    """
    host = (urlsplit(endpoint_url).hostname or "").lower()
    match = re.fullmatch(r"s3\.([a-z0-9-]+)\.backblazeb2\.com", host)
    if match:
        return match.group(1)
    return (configured_region or "").strip() or "auto"


def _s3_client():
    """Create an authenticated S3-compatible client for a private B2 bucket."""
    import boto3
    from botocore.config import Config

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
        region_name=_s3_signing_region(
            required["S3_ENDPOINT_URL"],
            os.getenv("S3_REGION"),
        ),
        # Bound network waits so a stalled provider request fails with an actionable
        # storage error instead of holding the synchronous API request for minutes.
        config=Config(
            connect_timeout=10,
            read_timeout=30,
            retries={"mode": "standard", "max_attempts": 2},
        ),
    )
    return client, required["S3_BUCKET"]


def download_s3_object(key: str):
    """Open a private S3/B2 object using server-side credentials."""
    client, bucket = _s3_client()
    return client.get_object(Bucket=bucket, Key=key)


def _upload_s3(
    file_obj: BinaryIO,
    filename: str,
    content_type: str,
    size_bytes: int | None = None,
) -> str:
    from boto3.s3.transfer import TransferConfig
    from botocore.exceptions import BotoCoreError, ClientError

    client, bucket = _s3_client()
    if size_bytes is None:
        file_obj.seek(0, 2)
        size_bytes = file_obj.tell()
    file_obj.seek(0)
    # B2's S3-compatible API is more reliable for ordinary objects when the
    # request carries an explicit Content-Length. TransferManager can otherwise
    # use a streaming upload path that some S3-compatible endpoints close early.
    # Reserve multipart transfers for objects larger than 64 MiB.
    try:
        if size_bytes <= 64 * 1024 * 1024:
            client.put_object(
                Bucket=bucket,
                Key=filename,
                Body=file_obj,
                ContentLength=size_bytes,
                ContentType=content_type or "application/octet-stream",
            )
        else:
            transfer_config = TransferConfig(
                multipart_threshold=64 * 1024 * 1024,
                multipart_chunksize=16 * 1024 * 1024,
                max_concurrency=2,
                use_threads=False,
            )
            client.upload_fileobj(
                file_obj,
                bucket,
                filename,
                ExtraArgs={"ContentType": content_type or "application/octet-stream"},
                Config=transfer_config,
            )
    except ClientError as exc:
        error = exc.response.get("Error", {})
        metadata = exc.response.get("ResponseMetadata", {})
        # Surface provider status/code without logging credentials, object keys, or
        # the raw provider message. The upload route includes this in its safe error log.
        code = str(error.get("Code", "Unknown"))[:64]
        http_status = metadata.get("HTTPStatusCode")
        raise RuntimeError(
            f"S3-compatible storage rejected the upload (code={code}, http_status={http_status})"
        ) from exc
    except BotoCoreError as exc:
        raise RuntimeError(
            f"S3-compatible storage request failed ({type(exc).__name__})"
        ) from exc

    raw_public_base = os.getenv("S3_PUBLIC_BASE_URL", "").strip().rstrip("/")
    if not raw_public_base:
        return ""
    public_base = _s3_public_base_url(bucket)
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
        "b2": ("S3_ENDPOINT_URL", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_BUCKET"),
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
                url = _upload_s3(file_obj, filename, content_type, size_bytes)
            return backend, storage_class, url
        except Exception as exc:
            if backend == "b2" and isinstance(exc, RuntimeError):
                # Preserve the safe provider status/code emitted by _upload_s3.
                # Other backends retain class-only errors to avoid exposing provider data.
                errors.append(f"{backend}: {str(exc)[:160]}")
            else:
                errors.append(f"{backend}: {exc.__class__.__name__}")
    raise RuntimeError("storage routing failed: " + ", ".join(errors))


def _google_drive_credentials():
    """Load OAuth credentials without overriding the scopes already granted.

    Google refresh tokens can reject a newly requested scope with
    `invalid_scope`. Preserve the granted scopes embedded in the authorized-user
    JSON when present; do not inject a new scope when the credential file
    does not record its scopes.
    """
    from google.oauth2.credentials import Credentials

    raw = os.getenv("GOOGLE_DRIVE_CREDENTIALS_JSON", "").strip()
    if not raw:
        raise RuntimeError("GOOGLE_DRIVE_CREDENTIALS_JSON is required for Google Drive exports")
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError("GOOGLE_DRIVE_CREDENTIALS_JSON must contain valid authorized-user OAuth JSON") from exc
    if not isinstance(data, dict):
        raise RuntimeError("GOOGLE_DRIVE_CREDENTIALS_JSON must be a JSON object")

    granted_scopes = data.get("scopes")
    if isinstance(granted_scopes, str):
        granted_scopes = granted_scopes.split()
    if granted_scopes is not None and not isinstance(granted_scopes, list):
        raise RuntimeError("Google Drive OAuth 'scopes' must be a list or whitespace-separated string")
    scopes = [str(scope).strip() for scope in (granted_scopes or []) if str(scope).strip()]
    # If the token JSON omits scopes, leave them unspecified. Passing a new
    # scope during refresh can make Google reject an otherwise valid refresh
    # token with invalid_scope.
    writable_scopes = {
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive",
    }
    if scopes and not writable_scopes.intersection(scopes):
        raise RuntimeError(
            "Google Drive OAuth credentials lack a supported write scope. "
            "Re-authorize the account with drive.file or drive access and update "
            "GOOGLE_DRIVE_CREDENTIALS_JSON."
        )
    try:
        return Credentials.from_authorized_user_info(data, scopes=scopes or None)
    except (KeyError, ValueError, TypeError) as exc:
        raise RuntimeError(
            "GOOGLE_DRIVE_CREDENTIALS_JSON is not a valid authorized-user OAuth credential. "
            "Use OAuth client credentials with refresh_token, client_id, client_secret, and token_uri."
        ) from exc


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
