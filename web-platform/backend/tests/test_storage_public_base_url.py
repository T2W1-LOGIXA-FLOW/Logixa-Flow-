from __future__ import annotations

from app.storage import _s3_public_base_url


def test_native_backblaze_host_root_includes_file_and_bucket(monkeypatch) -> None:
    monkeypatch.setenv("S3_PUBLIC_BASE_URL", "https://f004.backblazeb2.com")
    assert _s3_public_base_url("my-bucket") == "https://f004.backblazeb2.com/file/my-bucket"


def test_native_backblaze_file_prefix_includes_bucket(monkeypatch) -> None:
    monkeypatch.setenv("S3_PUBLIC_BASE_URL", "https://f004.backblazeb2.com/file")
    assert _s3_public_base_url("my-bucket") == "https://f004.backblazeb2.com/file/my-bucket"


def test_full_native_backblaze_bucket_prefix_is_preserved(monkeypatch) -> None:
    monkeypatch.setenv("S3_PUBLIC_BASE_URL", "https://f004.backblazeb2.com/file/my-bucket")
    assert _s3_public_base_url("my-bucket") == "https://f004.backblazeb2.com/file/my-bucket"


def test_custom_public_domain_is_preserved(monkeypatch) -> None:
    monkeypatch.setenv("S3_PUBLIC_BASE_URL", "https://cdn.example.com/uploads")
    assert _s3_public_base_url("my-bucket") == "https://cdn.example.com/uploads"
