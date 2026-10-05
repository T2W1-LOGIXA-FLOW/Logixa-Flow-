from __future__ import annotations

import io
import os
from typing import BinaryIO

import requests


def _configured(name: str) -> bool:
    return bool(os.getenv(name, "").strip())


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
        timeout=30,
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

    public_base = os.getenv("S3_PUBLIC_BASE_URL", "").strip().rstrip("/")
    if not public_base:
        raise RuntimeError("S3_PUBLIC_BASE_URL is required for B2 fallback")
    return f"{public_base}/{filename}"


def upload_image(file_obj: BinaryIO, filename: str, content_type: str) -> str:
    """Primary Cloudinary -> Supabase Storage -> B2 fallback chain.

    The fallback chain is explicit and only activates when a preceding backend
    is configured and its upload fails. Local disk remains the development default.
    """
    primary = os.getenv("UPLOAD_STORAGE_BACKEND", "local").strip().lower()
    fallbacks = [
        item.strip().lower()
        for item in os.getenv("STORAGE_FALLBACK_BACKENDS", "supabase,b2").split(",")
        if item.strip()
    ]
    backends = [primary] + [item for item in fallbacks if item != primary]

    errors: list[str] = []
    for backend in backends:
        try:
            if backend == "cloudinary":
                required = ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET")
                if not all(_configured(key) for key in required):
                    raise RuntimeError("Cloudinary is not configured")
                return _upload_cloudinary(file_obj, filename, content_type)
            if backend == "supabase":
                required = ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")
                if not all(_configured(key) for key in required):
                    raise RuntimeError("Supabase Storage is not configured")
                return _upload_supabase(file_obj, filename, content_type)
            if backend in {"b2", "r2", "s3"}:
                return _upload_s3(file_obj, filename, content_type)
            if backend == "local":
                return ""
            raise RuntimeError(f"unsupported storage backend: {backend}")
        except Exception as exc:
            errors.append(f"{backend}: {exc.__class__.__name__}")
    raise RuntimeError("all configured upload storage backends failed: " + ", ".join(errors))
