import logging
import uuid
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

from app.middleware import request_observability_middleware


def test_request_observability_logs_status_latency_and_request_id():
    app = FastAPI()
    app.middleware("http")(request_observability_middleware)

    @app.get("/ok")
    def ok():
        return {"status": "ok"}

    @app.get("/unavailable")
    def unavailable():
        return JSONResponse({"detail": "unavailable"}, status_code=503)

    with patch("app.middleware.logger.log") as log_call:
        with TestClient(app) as client:
            ok_response = client.get("/ok")
            unavailable_response = client.get("/unavailable")

    assert ok_response.status_code == 200
    request_id = ok_response.headers["X-Request-ID"]
    assert str(uuid.UUID(request_id)) == request_id
    assert unavailable_response.status_code == 503
    assert log_call.call_count == 2

    records = [
        call.kwargs["extra"]
        for call in log_call.call_args_list
        if call.args[1] == "HTTP request completed"
    ]
    assert len(records) == 2

    success = next(record for record in records if record["path"] == "/ok")
    assert success["method"] == "GET"
    assert success["status_code"] == 200
    assert success["duration_ms"] >= 0
    assert success["request_id"] == request_id
    assert log_call.call_args_list[0].args[0] == logging.INFO

    failure = next(record for record in records if record["path"] == "/unavailable")
    assert failure["status_code"] == 503
    assert failure["duration_ms"] >= 0
    failure_call = next(
        call for call in log_call.call_args_list
        if call.kwargs["extra"]["path"] == "/unavailable"
    )
    assert failure_call.args[0] == logging.ERROR
