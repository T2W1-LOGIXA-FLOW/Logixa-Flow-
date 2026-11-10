from __future__ import annotations

from app.cache import RateLimiter
from app.config import _secret_entropy_ok
from app.routers.uploads import _validate_image_upload
from app.routers import integration
from fastapi import HTTPException
from starlette.datastructures import UploadFile
from io import BytesIO
import struct
import zlib


def test_production_secret_entropy_rejects_repetition() -> None:
    assert not _secret_entropy_ok("A" * 64)
    assert not _secret_entropy_ok("short")


def test_production_secret_entropy_accepts_random_like_secret() -> None:
    assert _secret_entropy_ok("q7W!m3P#v9R@x2L$k8N^c4B&z6T*e1H?")


def test_memory_rate_limiter_enforces_limit() -> None:
    limiter = RateLimiter()
    assert limiter.allow("test-user", limit=2, window_seconds=60)
    assert limiter.allow("test-user", limit=2, window_seconds=60)
    assert not limiter.allow("test-user", limit=2, window_seconds=60)


def test_image_validation_rejects_mime_spoofing() -> None:
    upload = UploadFile(filename="spoof.png", file=BytesIO(b"not an image"), headers={"content-type": "image/png"})
    try:
        _validate_image_upload(upload)
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError("invalid image payload was accepted")


def _tiny_png() -> bytes:
    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">2I5B", 1, 1, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(b"\x00\x00\x00\x00"))
        + chunk(b"IEND", b"")
    )


def test_image_validation_accepts_valid_png() -> None:
    upload = UploadFile(filename="valid.png", file=BytesIO(_tiny_png()), headers={"content-type": "image/png"})
    _validate_image_upload(upload)


def test_redis_rate_limit_uses_atomic_script() -> None:
    class FakeRedis:
        def __init__(self) -> None:
            self.calls = []
        def eval(self, script, key_count, key, window):
            self.calls.append((script, key_count, key, window))
            return 1

    limiter = RateLimiter()
    fake = FakeRedis()
    limiter._redis = fake
    assert limiter.allow("shared-user", limit=1, window_seconds=30)
    assert len(fake.calls) == 1
    assert "INCR" in fake.calls[0][0] and "EXPIRE" in fake.calls[0][0]


def test_email_trigger_rejects_non_string_recipient_before_dispatch(monkeypatch) -> None:
    class AllowAll:
        def allow(self, *args, **kwargs):
            return True
    monkeypatch.setattr(integration, "rate_limiter", AllowAll())
    try:
        integration.trigger_email_endpoint({"to": 123}, db=None, _={"sub": "admin-1"})
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError("non-string email recipient was accepted")
