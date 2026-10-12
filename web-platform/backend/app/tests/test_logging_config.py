from __future__ import annotations

import json
import logging

from ..logging_config import JsonLogFormatter


def test_json_log_formatter_keeps_safe_rag_search_diagnostics():
    record = logging.LogRecord(
        name="app.routers.rag",
        level=logging.WARNING,
        pathname=__file__,
        lineno=1,
        msg="RAG search failed",
        args=(),
        exc_info=None,
    )
    record.correlation_id = "test-correlation"
    record.operation = "search"
    record.error_type = "unknown"
    record.error_class = "HTTPError"
    record.database_error_code = None
    record.provider_http_status = 400

    payload = json.loads(JsonLogFormatter().format(record))

    assert payload["error_class"] == "HTTPError"
    assert payload["provider_http_status"] == 400
    assert payload["error_type"] == "unknown"
    assert payload["correlation_id"] == "test-correlation"
    assert "exception" not in payload
