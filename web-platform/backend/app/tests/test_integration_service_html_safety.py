from app.integration_service import markdown_to_html


def test_markdown_to_html_escapes_untrusted_markup() -> None:
    rendered = markdown_to_html(
        "### Supplier brief\n<script>alert(1)</script>\nHook: <img src=x onerror=alert(1)>"
    )

    assert "<h2>Supplier brief</h2>" in rendered
    assert "<script>" not in rendered
    assert "<img" not in rendered
    assert "&lt;script&gt;" in rendered
    assert "&lt;img" in rendered
