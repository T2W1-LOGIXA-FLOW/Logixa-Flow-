from publisher import markdown_to_html


def test_publisher_escapes_untrusted_draft_markup() -> None:
    rendered = markdown_to_html("### Brief\n<script>alert(1)</script>\nHook: <img src=x onerror=alert(1)>")

    assert "<h1>Brief</h1>" in rendered
    assert "<script>" not in rendered
    assert "<img" not in rendered
    assert "&lt;script&gt;" in rendered
    assert "&lt;img" in rendered
