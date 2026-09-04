from io import BytesIO

from starlette.datastructures import UploadFile

from app.routers import rag
from app.schemas import RAGChunkStatus


def test_batch_ingestion_tracks_completed_files(monkeypatch):
    monkeypatch.setattr(
        rag,
        "_replace_chunks",
        lambda db, **kwargs: len(kwargs["chunks"]),
        raising=False,
    )
    files = [
        UploadFile(filename="one.txt", file=BytesIO(b"first document")),
        UploadFile(filename="two.md", file=BytesIO(b"second document")),
    ]

    result = rag.rag_ingest_batch(files=files, db=object(), _={"role": "admin"})

    assert result["total_files"] == 2
    assert result["completed_files"] == 2
    assert result["failed_files"] == 0
    assert {item["status"] for item in result["files"]} == {RAGChunkStatus.completed.value}


def test_batch_ingestion_reports_invalid_file_recovery(monkeypatch):
    monkeypatch.setattr(
        rag,
        "_prepare_batch_file",
        lambda file_name, content: (_ for _ in ()).throw(UnicodeDecodeError("utf-8", b"\xff", 0, 1, "invalid")),
    )
    result = rag.rag_ingest_batch(
        files=[UploadFile(filename="bad.bin", file=BytesIO(b"\xff"))],
        db=object(),
        _={"role": "admin"},
    )

    assert result["failed_files"] == 1
    assert result["files"][0]["status"] == RAGChunkStatus.failed.value
    assert result["files"][0]["recovery"]["retryable"] is False
