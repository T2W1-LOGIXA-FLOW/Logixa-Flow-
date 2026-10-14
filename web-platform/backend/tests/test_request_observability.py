import logging
import uuid

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

from app.middleware import request_observability_middleware


def test_request_observability_logs_status_latency_and_request_id(caplog):
    app = FastAPI()
    app.middleware("http")(request_observability_middleware)

    @app.get("/ok")
    def ok():
        return {"status": "ok"}

    @app.get("/unavailable")
    def unavailable():
        return JSONResponse({"detail": "unavailable"}, status_code=503)

    caplog.set_level(logging.INFO, logger="app.middleware")
    with TestClient(app) as client:
        ok_response = client.get("/ok")
        unavailable_response = client.get("/unavailable")

    assert ok_response.status_code == 200
    request_id = ok_response.headers["X-Request-ID"]
    assert str(uuid.UUID(request_id)) == request_id
    assert unavailable_response.status_code == 503

    completed = [
        record for record in caplog.records
        if record.name == "app.middleware" and record.getMessage() == "HTTP request completed"
    ]
    assert len(completed) == 2

    success = next(record for record in completed if record.path == "/ok")
    assert success.method == "GET"
    assert success.status_code == 200
    assert success.duration_ms >= 0
    assert success.request_id == request_id

    failure = next(record for record in completed if record.path == "/unavailable")
    assert failure.status_code == 503
    assert failure.levelno == logging.ERROR
    assert failure.duration_ms >= 0
