from __future__ import annotations

import base64
import io
import json
import os
import uuid

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
    try:
        response = requests.post(object_url, headers=headers, data=payload, timeout=60)
        response.raise_for_status()
        read = requests.get(object_url, headers=headers, timeout=60)
        read.raise_for_status()
        assert read.content == payload
    finally:
        requests.delete(object_url, headers=headers, timeout=60)


def test_live_b2_s3_round_trip() -> None:
    from app.storage import _s3_public_base_url

    values = _required(
        "S3_ENDPOINT_URL",
        "S3_ACCESS_KEY_ID",
        "S3_SECRET_ACCESS_KEY",
        "S3_BUCKET",
        "S3_PUBLIC_BASE_URL",
    )
    import boto3
    import requests

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
        public_url = f"{_s3_public_base_url(values['S3_BUCKET'])}/{key}"
        public_response = requests.get(public_url, timeout=60)
        assert public_response.status_code == 200, (
            f"B2 public object URL returned HTTP {public_response.status_code}; "
            f"response={public_response.text[:300]!r}. Check that S3_PUBLIC_BASE_URL "
            "is a public download base (native B2 format: https://fXXX.backblazeb2.com/file/<bucket>) "
            "or a correctly configured custom domain, not the S3 API endpoint."
        )
        assert public_response.content == payload
    finally:
        client.delete_object(Bucket=values["S3_BUCKET"], Key=key)


def test_live_google_drive_upload_round_trip() -> None:
    values = _required("GOOGLE_DRIVE_CREDENTIALS_JSON")
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseUpload

    credentials = Credentials.from_authorized_user_info(
        json.loads(values["GOOGLE_DRIVE_CREDENTIALS_JSON"]),
        scopes=["https://www.googleapis.com/auth/drive.file"],
    )
    service = build("drive", "v3", credentials=credentials, cache_discovery=False)
    filename = f"logixa-live-e2e-{uuid.uuid4().hex}.txt"
    payload = b"logixa-live-google-drive-e2e"
    metadata = {"name": filename}
    folder_id = os.getenv("GOOGLE_DRIVE_EXPORT_FOLDER_ID", "").strip()
    if folder_id:
        metadata["parents"] = [folder_id]

    created = service.files().create(
        body=metadata,
        media_body=MediaIoBaseUpload(io.BytesIO(payload), mimetype="text/plain", resumable=True),
        fields="id,name",
    ).execute()
    file_id = str(created["id"])
    try:
        downloaded = service.files().get_media(fileId=file_id).execute()
        assert downloaded == payload
    finally:
        service.files().delete(fileId=file_id).execute()
