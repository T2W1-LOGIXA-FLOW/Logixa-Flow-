"""Workflow WebSocket telemetry handler.

Provides authenticated real-time workflow status streaming to browser clients.
Imports ``_SUBSCRIBERS`` and ``_broadcast`` from ``workflow_execution`` so that
execution events flow through the same subscriber set.
"""
from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from starlette.concurrency import run_in_threadpool

from app.security import _verify_supabase_token
from app.routers.workflow_execution import _SUBSCRIBERS

logger = logging.getLogger(__name__)

_WEBSOCKET_AUTH_TIMEOUT_SECONDS = 10
_WEBSOCKET_AUTH_RECHECK_SECONDS = 60

router = APIRouter()


def _websocket_auth_close_code(exc: HTTPException) -> int:
    from fastapi import status
    if exc.status_code == status.HTTP_403_FORBIDDEN:
        return 4403
    if exc.status_code == status.HTTP_503_SERVICE_UNAVAILABLE:
        return 1013
    return 4401


@router.websocket("/ws")
async def workflow_telemetry(websocket: WebSocket) -> None:
    """Authenticate via the first WebSocket message, then stream workflow events."""
    # Browser WebSocket clients send the Supabase access token in the first message.
    await websocket.accept()
    try:
        raw_message = await asyncio.wait_for(
            websocket.receive_text(),
            timeout=_WEBSOCKET_AUTH_TIMEOUT_SECONDS,
        )
        message = json.loads(raw_message)
        token = message.get("token") if isinstance(message, dict) else None
        if not isinstance(message, dict) or message.get("type") != "auth" or not isinstance(token, str) or not token:
            await websocket.close(code=4401)
            return

        await run_in_threadpool(_verify_supabase_token, token)
        await websocket.send_json({"type": "auth.ok"})
    except (asyncio.TimeoutError, WebSocketDisconnect, json.JSONDecodeError, TypeError):
        await websocket.close(code=4401)
        return
    except HTTPException as exc:
        await websocket.close(code=_websocket_auth_close_code(exc))
        return

    _SUBSCRIBERS.add(websocket)
    loop = asyncio.get_running_loop()
    recheck_at = loop.time() + _WEBSOCKET_AUTH_RECHECK_SECONDS
    while True:
        try:
            await asyncio.wait_for(
                websocket.receive_text(),
                timeout=max(0, recheck_at - loop.time()),
            )
        except asyncio.TimeoutError:
            try:
                await run_in_threadpool(_verify_supabase_token, token)
            except HTTPException as exc:
                await websocket.close(code=_websocket_auth_close_code(exc))
                break
            recheck_at = loop.time() + _WEBSOCKET_AUTH_RECHECK_SECONDS
        except WebSocketDisconnect:
            break
    _SUBSCRIBERS.discard(websocket)
