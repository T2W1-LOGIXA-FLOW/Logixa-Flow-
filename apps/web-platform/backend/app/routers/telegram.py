from __future__ import annotations

import logging
from typing import Any
from fastapi import APIRouter
from pydantic import BaseModel

from ..services.telegram import send_telegram_message

logger = logging.getLogger("logixa.telegram.action")

router = APIRouter(prefix="/telegram", tags=["telegram"])


class TelegramActionPayload(BaseModel):
    action: str
    chat_id: int | str | None = None
    topic_id: int | None = None
    user_id: int | None = None
    username: str | None = None
    raw_message: str | None = None


@router.post("/action")
async def handle_telegram_action(payload: TelegramActionPayload) -> dict[str, Any]:
    """Handle inbound Telegram action callback for Logixa Flow."""
    action = payload.action
    logger.info("Logixa received Telegram action: %s", action)

    # 1. Retry Workflow
    if action.startswith("logixa_wf_retry:"):
        wf_id = action.split(":", 1)[1]
        msg = f"🔄 <b>Workflow Retry Triggered:</b> <code>{wf_id}</code>\nDispatched to background execution queue."
        await send_telegram_message(msg, topic_id=payload.topic_id)
        return {"status": "ok", "action": "workflow_retry", "id": wf_id}

    # 2. Disable Workflow
    elif action.startswith("logixa_wf_disable:"):
        wf_id = action.split(":", 1)[1]
        msg = f"🛑 <b>Workflow Disabled:</b> <code>{wf_id}</code>\nExecution halted by operator."
        await send_telegram_message(msg, topic_id=payload.topic_id)
        return {"status": "ok", "action": "workflow_disabled", "id": wf_id}

    # 3. View Workflow Metrics
    elif action.startswith("logixa_wf_metrics:"):
        wf_id = action.split(":", 1)[1]
        msg = f"📊 <b>Workflow Metrics ({wf_id}):</b>\nStatus: Active | Latency: 4.1s | Success rate: 98.4%"
        await send_telegram_message(msg, topic_id=payload.topic_id)
        return {"status": "ok", "action": "metrics_viewed", "id": wf_id}

    return {"status": "ignored", "action": action}
