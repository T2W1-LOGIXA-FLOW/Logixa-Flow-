from __future__ import annotations

import base64
import io
import json
import os
import sys
import uuid

from google.auth.exceptions import RefreshError

import pytest


pytestmark = pytest.mark.skipif(
    os.getenv("RUN_LIVE_E2E", "").strip() != "1",
    reason="Set RUN_LIVE_E2E=1 to run real provider release-gate tests",
)


def _required(*names: str) -> dict[str, str]:
    values = {name: os.getenv(name, "").strip() for name in names}
    missing = [name for name, value in values.items() if not value]
    if missing:
        pytest.skip("Missing live provider configuration: " + ", ".join(missing))
    return values


def test_live_cloudinary_upload_round_trip() -> None:
    from app import storage

    values = _required("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET")
    import cloudinary
    import cloudinary.api
    import cloudinary.uploader

    public_id = f"logixa/live-e2e-{uuid.uuid4().hex}"
    payload = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    )
    cloudinary.config(
        cloud_name=values["CLOUDINARY_CLOUD_NAME"],
        api_key=values["CLOUDINARY_API_KEY"],
        api_secret=values["CLOUDINARY_API_SECRET"],
        secure=True,
    )
    try:
        result = cloudinary.uploader.upload(
            io.BytesIO(payload),
            resource_type="image",
            public_id=public_id,
            overwrite=False,
            unique_filename=False,
        )
        assert result["public_id"] == public_id
        details = cloudinary.api.resource(public_id, resource_type="image")
        assert details["public_id"] == public_id
        assert details["bytes"] == len(payload)
    finally:
        cloudinary.uploader.destroy(public_id, resource_type="image", invalidate=True)


def test_live_supabase_storage_upload_round_trip() -> None:
    import requests

    values = _required("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_STORAGE_BUCKET")
    base = values["SUPABASE_URL"].rstrip("/")
    filename = f"logixa-live-e2e/{uuid.uuid4().hex}.txt"
    payload = b"logixa-live-storage-e2e"
    headers = {
        "Authorization": f"Bearer {values['SUPABASE_SERVICE_ROLE_KEY']}",
        "apikey": values["SUPABASE_SERVICE_ROLE_KEY"],
        "Content-Type": "text/plain",
        "x-upsert": "false",
    }
    object_url = f"{base}/storage/v1/object/{values['SUPABASE_STORAGE_BUCKET']}/{filename}"
    uploaded = False
    try:
        response = requests.post(object_url, headers=headers, data=payload, timeout=60)
        uploaded = True
        response.raise_for_status()
        read = requests.get(object_url, headers=headers, timeout=60)
        read.raise_for_status()
        assert read.content == payload
    finally:
        # Do not hide the original upload/read failure if cleanup also fails.
        # On an otherwise successful round-trip, cleanup must itself be 2xx.
        if uploaded:
            cleanup = requests.delete(object_url, headers=headers, timeout=60)
            if sys.exc_info()[0] is None:
                cleanup.raise_for_status()


def test_live_b2_s3_round_trip() -> None:
    """Verify private B2 upload/read/delete using authenticated S3 requests."""
    values = _required(
        "S3_ENDPOINT_URL",
        "S3_ACCESS_KEY_ID",
        "S3_SECRET_ACCESS_KEY",
        "S3_BUCKET",
    )
    import boto3

    key = f"logixa-live-e2e/{uuid.uuid4().hex}.txt"
    payload = b"logixa-live-b2-e2e"
    client = boto3.client(
        "s3",
        endpoint_url=values["S3_ENDPOINT_URL"],
        aws_access_key_id=values["S3_ACCESS_KEY_ID"],
        aws_secret_access_key=values["S3_SECRET_ACCESS_KEY"],
        region_name=os.getenv("S3_REGION", "auto"),
    )
    try:
        client.put_object(
            Bucket=values["S3_BUCKET"],
            Key=key,
            Body=payload,
            ContentType="text/plain",
        )
        response = client.get_object(Bucket=values["S3_BUCKET"], Key=key)
        assert response["Body"].read() == payload
        # A private bucket is intentionally read through authenticated S3 API;
        # no public-download URL or public bucket ACL is required for this gate.
    finally:
        client.delete_object(Bucket=values["S3_BUCKET"], Key=key)


def test_live_b2_application_download_proxy_round_trip() -> None:
    """Upload through the deployed app, download via its opaque URL, and clean up."""
    import boto3
    import requests
    import time

    values = _required(
        "PRODUCTION_API_URL",
        "SUPABASE_URL",
        "SUPABASE_PUBLISHABLE_KEY",
        "PRODUCTION_ADMIN_EMAIL",
        "PRODUCTION_ADMIN_PASSWORD",
        "SUPABASE_SERVICE_ROLE_KEY",
        "S3_ENDPOINT_URL",
        "S3_ACCESS_KEY_ID",
        "S3_SECRET_ACCESS_KEY",
        "S3_BUCKET",
    )
    api_base = values["PRODUCTION_API_URL"].rstrip("/")
    supabase_base = values["SUPABASE_URL"].rstrip("/")
    payload = (
        b"\x89PNG\r\n\x1a\n"
        + b"logixa-live-b2-proxy-e2e:"
        + uuid.uuid4().hex.encode("ascii")
        + b"\x00" * (10 * 1024 * 1024 + 1)
    )
    session = requests.Session()
    # Render Free services may sleep between test runs. Retry transient gateway
    # responses while the instance starts, then require a successful health check
    # before attempting the upload. This isolates cold-start latency from storage.
    health_deadline = time.monotonic() + 120
    health_error: Exception | str | None = None
    while time.monotonic() < health_deadline:
        try:
            health = session.get(f"{api_base}/health", timeout=(5, 15))
            if health.status_code < 500:
                health.raise_for_status()
                break
            health_error = f"health endpoint returned HTTP {health.status_code}"
        except requests.HTTPError:
            # A deterministic client error (for example, a wrong health path)
            # is not a cold-start condition and should fail immediately.
            raise
        except requests.RequestException as exc:
            health_error = exc
        time.sleep(3)
    else:
        pytest.fail(
            f"Production API did not become healthy within 120 seconds: {health_error}",
            pytrace=False,
        )

    token_response = session.post(
        f"{supabase_base}/auth/v1/token?grant_type=password",
        headers={"apikey": values["SUPABASE_PUBLISHABLE_KEY"], "Content-Type": "application/json"},
        json={
            "email": values["PRODUCTION_ADMIN_EMAIL"],
            "password": values["PRODUCTION_ADMIN_PASSWORD"],
        },
        timeout=30,
    )
    token_response.raise_for_status()
    access_token = token_response.json().get("access_token")
    assert isinstance(access_token, str) and access_token
    auth_headers = {"Authorization": f"Bearer {access_token}"}

    file_id: str | None = None
    try:
        uploaded = session.post(
            f"{api_base}/api/uploads",
            headers=auth_headers,
            files={"file": (f"logixa-live-b2-proxy-{uuid.uuid4().hex}.png", payload, "image/png")},
            timeout=(10, 180),
        )
        uploaded.raise_for_status()
        opaque_url = uploaded.json().get("url")
        assert isinstance(opaque_url, str) and opaque_url.startswith("/api/uploads/files/")
        file_id = opaque_url.rstrip("/").split("/")[-1]
        assert file_id

        downloaded = session.get(f"{api_base}{opaque_url}", timeout=180)
        downloaded.raise_for_status()
        assert downloaded.content == payload
        assert downloaded.headers.get("X-Content-Type-Options", "").lower() == "nosniff"
        assert downloaded.headers.get("Cache-Control", "").lower().startswith("private")
        assert downloaded.headers.get("Content-Type", "").split(";", 1)[0].lower() == "image/png"
        assert int(downloaded.headers.get("Content-Length", "-1")) == len(payload)
    finally:
        if file_id:
            service_headers = {
                "Authorization": f"Bearer {values['SUPABASE_SERVICE_ROLE_KEY']}",
                "apikey": values["SUPABASE_SERVICE_ROLE_KEY"],
            }
            # Query metadata before deleting it so the matching private B2 object can be removed.
            cleanup_error: Exception | None = None
            try:
                metadata = requests.get(
                    f"{supabase_base}/rest/v1/stored_files",
                    params={"select": "id,object_key", "id": f"eq.{file_id}"},
                    headers=service_headers,
                    timeout=30,
                )
                metadata.raise_for_status()
                rows = metadata.json()
                assert isinstance(rows, list) and len(rows) == 1, "uploaded file metadata was not found for cleanup"
                object_key = rows[0].get("object_key")
                assert isinstance(object_key, str) and object_key
                client = boto3.client(
                    "s3",
                    endpoint_url=values["S3_ENDPOINT_URL"],
                    aws_access_key_id=values["S3_ACCESS_KEY_ID"],
                    aws_secret_access_key=values["S3_SECRET_ACCESS_KEY"],
                    region_name=os.getenv("S3_REGION", "auto"),
                )
                client.delete_object(Bucket=values["S3_BUCKET"], Key=object_key)
                removed = requests.delete(
                    f"{supabase_base}/rest/v1/stored_files",
                    params={"id": f"eq.{file_id}"},
                    headers={**service_headers, "Prefer": "return=minimal"},
                    timeout=30,
                )
                removed.raise_for_status()
            except Exception as exc:
                cleanup_error = exc
            if cleanup_error is not None and sys.exc_info()[0] is None:
                raise AssertionError("B2 proxy E2E cleanup failed") from cleanup_error


def test_live_google_drive_upload_round_trip() -> None:
    _required("GOOGLE_DRIVE_CREDENTIALS_JSON")
    from app.storage import _google_drive_credentials
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseUpload

    credentials = _google_drive_credentials()
    service = build("drive", "v3", credentials=credentials, cache_discovery=False)
    filename = f"logixa-live-e2e-{uuid.uuid4().hex}.txt"
    payload = b"logixa-live-google-drive-e2e"
    metadata = {"name": filename}
    folder_id = os.getenv("GOOGLE_DRIVE_EXPORT_FOLDER_ID", "").strip()
    if folder_id:
        metadata["parents"] = [folder_id]

    # Create can fail during OAuth refresh before a file ID exists. Report the
    # configuration problem directly instead of exposing a long auth traceback.
    try:
        created = service.files().create(
            body=metadata,
            media_body=MediaIoBaseUpload(io.BytesIO(payload), mimetype="text/plain", resumable=True),
            fields="id,name",
        ).execute()
    except RefreshError as exc:
        pytest.fail(
            "Google Drive OAuth refresh failed. Check that GOOGLE_DRIVE_CREDENTIALS_JSON "
            "contains a valid refresh token and its recorded scopes include drive.file or drive; "
            "re-authorize the account and replace the GitHub production-environment secret. "
            f"Provider error: {exc}",
            pytrace=False,
        )

    file_id = str(created["id"])
    try:
        downloaded = service.files().get_media(fileId=file_id).execute()
        assert downloaded == payload
    finally:
        # Delete the test artifact even when download or content verification fails.
        service.files().delete(fileId=file_id).execute()
