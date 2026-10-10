from __future__ import annotations

import io

from app import storage


class FakeS3Client:
    def __init__(self) -> None:
        self.put_kwargs = None
        self.transfer_args = None

    def put_object(self, **kwargs):
        self.put_kwargs = kwargs
        return {}

    def upload_fileobj(self, *args, **kwargs):
        self.transfer_args = (args, kwargs)


def test_small_b2_upload_uses_put_object_with_explicit_content_length(monkeypatch):
    payload = b"small private B2 upload"
    file_obj = io.BytesIO(payload)
    client = FakeS3Client()
    monkeypatch.setattr(storage, "_s3_client", lambda: (client, "private-bucket"))
    monkeypatch.delenv("S3_PUBLIC_BASE_URL", raising=False)

    result = storage._upload_s3(file_obj, "sample.png", "image/png", len(payload))

    assert result == ""
    assert client.put_kwargs is not None
    assert client.put_kwargs["Bucket"] == "private-bucket"
    assert client.put_kwargs["Key"] == "sample.png"
    assert client.put_kwargs["ContentLength"] == len(payload)
    assert client.put_kwargs["ContentType"] == "image/png"
    assert client.put_kwargs["Body"] == payload
    assert client.transfer_args is None


def test_large_b2_upload_keeps_bounded_multipart_transfer(monkeypatch):
    file_obj = io.BytesIO(b"x")
    client = FakeS3Client()
    monkeypatch.setattr(storage, "_s3_client", lambda: (client, "private-bucket"))
    monkeypatch.delenv("S3_PUBLIC_BASE_URL", raising=False)

    result = storage._upload_s3(
        file_obj,
        "large.bin",
        "application/octet-stream",
        64 * 1024 * 1024 + 1,
    )

    assert result == ""
    assert client.put_kwargs is None
    assert client.transfer_args is not None
    args, kwargs = client.transfer_args
    assert args[0] is file_obj
    assert args[1:] == ("private-bucket", "large.bin")
    assert kwargs["ExtraArgs"]["ContentType"] == "application/octet-stream"
    assert kwargs["Config"].multipart_threshold == 64 * 1024 * 1024
    assert kwargs["Config"].multipart_chunksize == 16 * 1024 * 1024
    assert kwargs["Config"].use_threads is False



def test_b2_signing_region_is_derived_from_regional_endpoint():
    assert storage._s3_signing_region(
        "https://s3.us-west-004.backblazeb2.com",
        "auto",
    ) == "us-west-004"


def test_non_b2_s3_endpoint_keeps_explicit_region():
    assert storage._s3_signing_region(
        "https://s3.example.com",
        "eu-central-1",
    ) == "eu-central-1"


def test_non_b2_s3_endpoint_defaults_to_auto_region():
    assert storage._s3_signing_region("https://s3.example.com", None) == "auto"



def test_closed_b2_upload_reports_safe_connectivity_probe(monkeypatch):
    import pytest
    from botocore.exceptions import ConnectionClosedError

    class ClosedUploadClient(FakeS3Client):
        def put_object(self, **kwargs):
            raise ConnectionClosedError(endpoint_url="https://s3.example.invalid")

        def head_bucket(self, **kwargs):
            return {}

    client = ClosedUploadClient()
    monkeypatch.setattr(storage, "_s3_client", lambda: (client, "private-bucket"))
    monkeypatch.setenv("S3_ENDPOINT_URL", "https://s3.us-west-004.backblazeb2.com")
    monkeypatch.setenv("S3_REGION", "auto")
    monkeypatch.delenv("S3_PUBLIC_BASE_URL", raising=False)

    with pytest.raises(RuntimeError) as error:
        storage._upload_s3(io.BytesIO(b"payload"), "sample.png", "image/png", 7)

    message = str(error.value)
    assert "ConnectionClosedError" in message
    assert "host=s3.us-west-004.backblazeb2.com" in message
    assert "region=us-west-004" in message
    assert "connectivity_probe=head_bucket_ok" in message
