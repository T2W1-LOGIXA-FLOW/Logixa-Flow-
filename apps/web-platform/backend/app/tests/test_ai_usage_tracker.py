from ..services.ai_usage_tracker import _classify_alert_title, _sanitize_alert_reason


def test_ai_authentication_errors_are_not_mislabeled_as_quota_exhaustion():
    assert _classify_alert_title("401 Client Error: Unauthorized") == "AI Provider Authentication Alert"
    assert _classify_alert_title("403 Forbidden") == "AI Provider Authentication Alert"


def test_quota_and_rate_limit_errors_are_classified_as_quota_alerts():
    assert _classify_alert_title("429 Too Many Requests") == "AI Quota Exhaustion Alert"
    assert _classify_alert_title("provider quota exceeded") == "AI Quota Exhaustion Alert"


def test_other_provider_errors_use_generic_alert_title():
    assert _classify_alert_title("connection timed out") == "AI Provider Error Alert"


def test_alert_reason_redacts_api_keys_and_bearer_tokens():
    reason = (
        "401 Unauthorized https://example.test/?key=secret-value "
        "Authorization: Bearer abc.def.ghi "
        "AIza123456789012345678901234567890"
    )
    safe = _sanitize_alert_reason(reason)
    assert "secret-value" not in safe
    assert "abc.def.ghi" not in safe
    assert "AIza123456789012345678901234567890" not in safe
    assert "[redacted]" in safe
