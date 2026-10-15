from __future__ import annotations

from app.routers.knowledge import _parse_file


def test_parse_json_records():
    records = _parse_file("sample.json", b'[{"title":"A","content":"Long enough content here.","category":"Research"}]')
    assert len(records) == 1
    assert records[0]["title"] == "A"
    assert records[0]["category"] == "Research"


def test_parse_csv_records():
    records = _parse_file("sample.csv", b"title,content,category\nA,Long enough content here.,News\n")
    assert len(records) == 1
    assert records[0]["title"] == "A"


def test_parse_markdown_single_record():
    records = _parse_file("sample.md", b"# Heading\n\nLong enough markdown content.")
    assert records[0]["title"] == "Heading"
    assert "markdown content" in records[0]["content"]


def test_parse_html_strips_scripts_and_tags():
    records = _parse_file("sample.html", b"<h1>Heading</h1><script>alert(1)</script><p>Long enough content.</p>")
    assert records[0]["title"] == "Heading"
    assert "alert" not in records[0]["content"]


def test_rejects_unsupported_file_type():
    try:
        _parse_file("sample.pdf", b"not supported")
    except ValueError as exc:
        assert "unsupported file type" in str(exc)
    else:
        raise AssertionError("expected unsupported file type error")
