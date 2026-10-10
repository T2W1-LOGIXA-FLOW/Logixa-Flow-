from __future__ import annotations

from io import BytesIO
from types import SimpleNamespace
import asyncio

import pytest

from app import config, qstash, storage
from app.routers import uploads


def test_qstash_requires_token_and_destination(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("QSTASH_TOKEN", raising=False)
    monkeypatch.delenv("QSTASH_DESTINATION_URL", raising=False)
    assert qstash.qstash_configured() is False

    monkeypatch.setenv("QSTASH_TOKEN", "token")
    monkeypatch.setenv("QSTASH_DESTINATION_URL", "https://api.example.com")
    assert qstash.qstash_configured() is True


def test_storage_policy_routes_by_type_and_size() -> None:
    assert storage.classify_storage("photo.jpg", "image/jpeg", 9 * 1024 * 1024) == "cloudinary"
    assert storage.classify_storage("invoice.pdf", "application/pdf", 49 * 1024 * 1024) == "supabase"
    assert storage.classify_storage("dataset.zip", "application/zip", 51 * 1024 * 1024) == "b2"
    assert storage.classify_storage("large-photo.jpg", "image/jpeg", 11 * 1024 * 1024) == "b2"


def test_storage_routing_falls_back_from_cloudinary_to_supabase(monkeypatch: pytest.MonkeyPatch) -> None:
    for key, value in {
        "CLOUDINARY_CLOUD_NAME": "cloud",
        "CLOUDINARY_API_KEY": "key",
        "CLOUDINARY_API_SECRET": "secret",
        "SUPABASE_URL": "https://example.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "service",
        "SUPABASE_STORAGE_BUCKET": "uploads",
    }.items():
        monkeypatch.setenv(key, value)

    calls: list[str] = []

    def fail_cloudinary(*args, **kwargs):
        calls.append("cloudinary")
        raise RuntimeError("primary unavailable")

    def succeed_supabase(*args, **kwargs):
        calls.append("supabase")
        return "https://example.supabase.co/storage/v1/object/public/uploads/file.jpg"

    monkeypatch.setattr(storage, "_upload_cloudinary", fail_cloudinary)
    monkeypatch.setattr(storage, "_upload_supabase", succeed_supabase)

    backend, storage_class, url = storage.upload_routed(BytesIO(b"image"), "file.jpg", "image/jpeg", 1024)
    assert backend == "supabase"
    assert storage_class == "cloudinary"
    assert url.endswith("/file.jpg")
    assert calls == ["cloudinary", "supabase"]


def test_production_env_requires_celery_redis_and_storage(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("JWT_SECRET", "j" * 32)
    monkeypatch.setenv("API_SECRET_TOKEN", "a" * 32)
    monkeypatch.setenv("CELERY_ENABLED", "true")
    monkeypatch.delenv("REDIS_URL", raising=False)
    monkeypatch.setenv("UPLOAD_STORAGE_BACKEND", "cloudinary")
    monkeypatch.setenv("STORAGE_FALLBACK_BACKENDS", "supabase,b2")
    for key in (
        "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET",
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_STORAGE_BUCKET",
        "S3_ENDPOINT_URL",
        "S3_ACCESS_KEY_ID",
        "S3_SECRET_ACCESS_KEY",
        "S3_BUCKET",
        "S3_PUBLIC_BASE_URL",
    ):
        monkeypatch.delenv(key, raising=False)

    missing = config.validate_env()

    assert any(item.startswith("REDIS_URL") for item in missing)
    assert any(item.startswith("CLOUDINARY_CLOUD_NAME") for item in missing)
    assert any(item.startswith("SUPABASE_URL") for item in missing)
    assert any(item.startswith("S3_ENDPOINT_URL") for item in missing)
    assert not any(item.startswith("S3_PUBLIC_BASE_URL") for item in missing)


def test_qstash_publish_targets_dispatch_endpoint(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("QSTASH_TOKEN", "token")
    monkeypatch.setenv("QSTASH_DESTINATION_URL", "https://logixa-flow.onrender.com")

    class Response:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, str]:
            return {"messageId": "msg-123"}

    captured: dict[str, object] = {}

    def fake_post(url, json, headers, timeout):
        captured.update({"url": url, "json": json, "headers": headers, "timeout": timeout})
        return Response()

    monkeypatch.setattr(qstash.requests, "post", fake_post)
    message_id = qstash.publish_workflow_run("run-123", 1_900_000_000)

    assert message_id == "msg-123"
    assert captured["url"] == "https://qstash.upstash.io/v2/publish/https://logixa-flow.onrender.com/api/admin/workflow/qstash-dispatch"
    assert captured["json"] == {"run_id": "run-123"}
    headers = captured["headers"]
    assert headers["Upstash-Deduplication-Id"] == "run-123"
    assert headers["Upstash-Not-Before"] == "1900000000"


def test_production_env_allows_render_free_without_celery(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("JWT_SECRET", "j" * 32)
    monkeypatch.setenv("API_SECRET_TOKEN", "a" * 32)
    monkeypatch.setenv("CELERY_ENABLED", "false")
    monkeypatch.delenv("REDIS_URL", raising=False)
    monkeypatch.setenv("QSTASH_TOKEN", "qstash-token")
    monkeypatch.setenv("QSTASH_DESTINATION_URL", "https://logixa-flow.onrender.com")
    monkeypatch.setenv("QSTASH_CURRENT_SIGNING_KEY", "current")
    monkeypatch.setenv("QSTASH_NEXT_SIGNING_KEY", "next")
    monkeypatch.setenv("UPLOAD_STORAGE_BACKEND", "cloudinary")
    monkeypatch.setenv("STORAGE_FALLBACK_BACKENDS", "supabase,b2")
    for key in (
        "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET",
        "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_STORAGE_BUCKET",
        "S3_ENDPOINT_URL", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_BUCKET", "S3_PUBLIC_BASE_URL",
    ):
        monkeypatch.delenv(key, raising=False)

    missing = config.validate_env()
    assert not any(item.startswith("REDIS_URL") for item in missing)


def test_storage_routing_falls_back_from_supabase_to_b2(monkeypatch: pytest.MonkeyPatch) -> None:
    for key, value in {
        "SUPABASE_URL": "https://example.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "service",
        "SUPABASE_STORAGE_BUCKET": "uploads",
        "S3_ENDPOINT_URL": "https://s3.example.com",
        "S3_ACCESS_KEY_ID": "key",
        "S3_SECRET_ACCESS_KEY": "secret",
        "S3_BUCKET": "uploads",
        "S3_PUBLIC_BASE_URL": "https://cdn.example.com",
    }.items():
        monkeypatch.setenv(key, value)

    calls: list[str] = []

    def fail_supabase(*args, **kwargs):
        calls.append("supabase")
        raise RuntimeError("primary unavailable")

    def succeed_b2(*args, **kwargs):
        calls.append("b2")
        return "https://cdn.example.com/file.pdf"

    monkeypatch.setattr(storage, "_upload_supabase", fail_supabase)
    monkeypatch.setattr(storage, "_upload_s3", succeed_b2)

    backend, storage_class, url = storage.upload_routed(
        BytesIO(b"document"),
        "file.pdf",
        "application/pdf",
        1024,
    )
    assert backend == "b2"
    assert storage_class == "supabase"
    assert url.endswith("/file.pdf")
    assert calls == ["supabase", "b2"]


def test_private_b2_upload_does_not_require_public_base_url(monkeypatch: pytest.MonkeyPatch) -> None:
    for key, value in {
        "S3_ENDPOINT_URL": "https://s3.example.com",
        "S3_ACCESS_KEY_ID": "key",
        "S3_SECRET_ACCESS_KEY": "secret",
        "S3_BUCKET": "uploads",
    }.items():
        monkeypatch.setenv(key, value)
    monkeypatch.delenv("S3_PUBLIC_BASE_URL", raising=False)

    class FakeClient:
        def put_object(self, **kwargs):
            assert kwargs["ContentLength"] == len(b"payload")
            assert kwargs["Body"].read() == b"payload"
            return None

    import sys
    import types

    # Model the boto3 package and transfer submodule without requiring live AWS/B2.
    fake_boto3 = types.ModuleType("boto3")
    fake_boto3.__path__ = []
    fake_boto3.client = lambda *args, **kwargs: FakeClient()
    fake_s3 = types.ModuleType("boto3.s3")
    fake_s3.__path__ = []
    fake_transfer = types.ModuleType("boto3.s3.transfer")

    class FakeTransferConfig:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

    fake_transfer.TransferConfig = FakeTransferConfig
    monkeypatch.setitem(sys.modules, "boto3", fake_boto3)
    monkeypatch.setitem(sys.modules, "boto3.s3", fake_s3)
    monkeypatch.setitem(sys.modules, "boto3.s3.transfer", fake_transfer)

    assert storage._upload_s3(BytesIO(b"payload"), "file.txt", "text/plain") == ""


def test_private_b2_download_streams_object_without_public_bucket(monkeypatch: pytest.MonkeyPatch) -> None:
    record = SimpleNamespace(
        id="opaque-file-id",
        storage_backend="b2",
        is_export=False,
        object_key="random-key/large-file.bin",
        content_type="application/octet-stream",
    )

    class FakeQuery:
        def filter(self, *_):
            return self

        def first(self):
            return record

    class FakeDB:
        def query(self, *_):
            return FakeQuery()

        def close(self):
            return None

    class FakeBody:
        closed = False

        def iter_chunks(self, chunk_size):
            assert chunk_size == 64 * 1024
            yield b"private "
            yield b"object"

        def close(self):
            self.closed = True

    body = FakeBody()
    monkeypatch.setattr(uploads, "SessionLocal", FakeDB)
    monkeypatch.setattr(
        uploads,
        "download_s3_object",
        lambda key: {"Body": body, "ContentLength": 14},
    )

    response = uploads.download_stored_file("opaque-file-id")

    async def collect() -> bytes:
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)
        return b"".join(chunks)

    assert asyncio.run(collect()) == b"private object"
    assert response.media_type == "application/octet-stream"
    assert response.headers["content-disposition"] == "attachment"
    assert response.headers["content-security-policy"] == "sandbox"
    assert response.headers["content-length"] == "14"
    assert body.closed is True


def test_private_b2_download_does_not_expose_non_b2_records(monkeypatch: pytest.MonkeyPatch) -> None:
    record = SimpleNamespace(storage_backend="supabase", is_export=False)

    class FakeQuery:
        def filter(self, *_):
            return self

        def first(self):
            return record

    class FakeDB:
        def query(self, *_):
            return FakeQuery()

        def close(self):
            return None

    monkeypatch.setattr(uploads, "SessionLocal", FakeDB)
    with pytest.raises(uploads.HTTPException) as exc:
        uploads.download_stored_file("not-a-b2-file")
    assert exc.value.status_code == 404
