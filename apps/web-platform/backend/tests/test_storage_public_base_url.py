from __future__ import annotations

import io

import pytest
from botocore.exceptions import ClientError

from app import storage
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


def test_s3_api_endpoint_becomes_virtual_hosted_public_url(monkeypatch) -> None:
    monkeypatch.setenv("S3_PUBLIC_BASE_URL", "https://s3.us-west-004.backblazeb2.com")
    assert _s3_public_base_url("my-bucket") == "https://my-bucket.s3.us-west-004.backblazeb2.com"


def test_s3_endpoint_with_bucket_path_does_not_duplicate_bucket(monkeypatch) -> None:
    monkeypatch.setenv("S3_PUBLIC_BASE_URL", "https://s3.us-west-004.backblazeb2.com/my-bucket")
    assert _s3_public_base_url("my-bucket") == "https://my-bucket.s3.us-west-004.backblazeb2.com"


def test_existing_bucket_specific_s3_host_is_preserved(monkeypatch) -> None:
    monkeypatch.setenv("S3_PUBLIC_BASE_URL", "https://my-bucket.s3.us-west-004.backblazeb2.com")
    assert _s3_public_base_url("my-bucket") == "https://my-bucket.s3.us-west-004.backblazeb2.com"


def test_custom_public_domain_is_preserved(monkeypatch) -> None:
    monkeypatch.setenv("S3_PUBLIC_BASE_URL", "https://cdn.example.com/uploads")
    assert _s3_public_base_url("my-bucket") == "https://cdn.example.com/uploads"



def test_b2_upload_failure_preserves_safe_provider_diagnostic(monkeypatch) -> None:
    monkeypatch.setenv("S3_ENDPOINT_URL", "https://s3.us-west-004.backblazeb2.com")
    monkeypatch.setenv("S3_ACCESS_KEY_ID", "test-key")
    monkeypatch.setenv("S3_SECRET_ACCESS_KEY", "test-secret")
    monkeypatch.setenv("S3_BUCKET", "my-bucket")

    def fail_upload(*args, **kwargs):
        raise RuntimeError(
            "S3-compatible storage rejected the upload (code=AccessDenied, http_status=403)"
        )

    monkeypatch.setattr(storage, "_upload_s3", fail_upload)
    with pytest.raises(RuntimeError, match=r"code=AccessDenied, http_status=403"):
        storage.upload_routed(
            io.BytesIO(b"test"),
            "large-image.png",
            "image/png",
            10 * 1024 * 1024 + 1,
        )



def test_b2_client_error_is_reduced_to_safe_code_and_status(monkeypatch) -> None:
    class FailingS3Client:
        def put_object(self, **kwargs):
            raise ClientError(
                {
                    "Error": {"Code": "AccessDenied", "Message": "sensitive provider detail"},
                    "ResponseMetadata": {"HTTPStatusCode": 403},
                },
                "PutObject",
            )

    monkeypatch.setattr(storage, "_s3_client", lambda: (FailingS3Client(), "my-bucket"))
    with pytest.raises(RuntimeError, match=r"code=AccessDenied, http_status=403") as caught:
        storage._upload_s3(io.BytesIO(b"test"), "object-key.png", "image/png")
    assert "sensitive provider detail" not in str(caught.value)
    assert "object-key.png" not in str(caught.value)
