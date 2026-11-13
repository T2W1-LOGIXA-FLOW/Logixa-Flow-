from agents.collector import extract_entry_summary


def test_extract_entry_summary_prefers_full_rss_content_encoded():
    entry = {
        "summary": "<p>Short feed summary.</p>",
        "content": [{"type": "text/html", "value": "<p>Full <strong>article</strong> body with details.</p>"}],
    }
    assert extract_entry_summary(entry) == "Full article body with details."


def test_extract_entry_summary_falls_back_to_summary_detail_then_description():
    assert extract_entry_summary({"summary_detail": {"value": "<p>Detailed summary</p>"}, "summary": "short"}) == "Detailed summary"
    assert extract_entry_summary({"description": "<p>Legacy description</p>"}) == "Legacy description"


def test_extract_entry_summary_handles_missing_content():
    assert extract_entry_summary({}) == ""
