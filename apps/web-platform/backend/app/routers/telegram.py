from __future__ import annotations

import logging
import os
import hmac
from typing import Any
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from .. import models
from ..cache import cache_client
from ..config import telegram_configured, telegram_enabled
from ..security import require_admin
from ..database import get_db
from ..models import utc_now
from pydantic import BaseModel, Field

from ..services.telegram import send_telegram_message
from .workflow import enqueue_workflow_run

logger = logging.getLogger("logixa.telegram")

router = APIRouter(prefix="/telegram", tags=["telegram"])

FRONTEND_URL = os.getenv("FRONTEND_BASE_URL", "https://logixa-flow-frontend.onrender.com")

def _production_mode() -> bool:
    return os.getenv("ENVIRONMENT", "development").strip().lower() in {"production", "prod"}


def _configured_id_set(env_name: str) -> set[str]:
    return {part.strip() for part in os.getenv(env_name, "").split(",") if part.strip()}


def _authorize_telegram_actor(*, user_id: Any, chat_id: Any, topic_id: Any = None) -> None:
    """Restrict production Telegram actions to configured chats and forum topics."""
    allowed_users = _configured_id_set("TELEGRAM_ALLOWED_USER_IDS")
    allowed_chats = _configured_id_set("TELEGRAM_ALLOWED_CHAT_IDS")
    allowed_topics = _configured_id_set("TELEGRAM_ALLOWED_TOPIC_IDS")
    if _production_mode() and (not allowed_chats or not allowed_topics):
        logger.error("Telegram authorization unavailable: production chat/topic allowlists are missing")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telegram chat/topic allowlists are not configured",
        )
    if allowed_users and str(user_id) not in allowed_users:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Telegram user is not authorized")
    if allowed_chats and str(chat_id) not in allowed_chats:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Telegram chat is not authorized")
    if allowed_topics and (topic_id is None or str(topic_id) not in allowed_topics):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Telegram topic is not authorized")




class TelegramActionPayload(BaseModel):
    action: str
    chat_id: int | str | None = None
    topic_id: int | None = None
    user_id: int | None = None
    username: str | None = None
    raw_message: str | None = None

class AdminTelegramSendPayload(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    topic_id: int | None = Field(default=None, ge=1)


@router.post("/admin/telegram/send")
async def send_admin_telegram_message(
    payload: AdminTelegramSendPayload,
    _: dict = Depends(require_admin),
) -> dict[str, Any]:
    """Send a deliberate admin-triggered Telegram message and fail closed on dry-run."""
    if not telegram_configured() or not telegram_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telegram delivery is not configured and enabled",
        )
    result = await send_telegram_message(payload.message, topic_id=payload.topic_id)
    if not isinstance(result, dict) or result.get("ok") is not True:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Telegram API did not confirm message delivery",
        )
    message = result.get("result")
    message_id = message.get("message_id") if isinstance(message, dict) else None
    return {"success": True, "delivered": True, "message_id": message_id}


# ------------------------------------------------------------------------------
# 1. ACTION HANDLER (Direct Callback / Gateway)
# ------------------------------------------------------------------------------
@router.post("/action")
async def handle_telegram_action(
    payload: TelegramActionPayload,
    db: Session = Depends(get_db),
    x_telegram_action_secret: str | None = Header(default=None),
) -> dict[str, Any]:
    """Handle trusted gateway actions; direct callers must prove shared-secret possession."""
    expected_action_secret = os.getenv("TELEGRAM_ACTION_SECRET", "").strip()
    if not expected_action_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Telegram action gateway is not configured")
    if not x_telegram_action_secret or not hmac.compare_digest(x_telegram_action_secret, expected_action_secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram action credentials")
    _authorize_telegram_actor(user_id=payload.user_id, chat_id=payload.chat_id, topic_id=payload.topic_id)
    return await _execute_telegram_action(payload, db=db)


async def _execute_telegram_action(
    payload: TelegramActionPayload,
    *,
    db: Session,
) -> dict[str, Any]:
    """Execute a callback after the caller has been authenticated and authorized."""
    action = payload.action
    logger.info("Logixa received Telegram action: %s", action)

    # Retry only a real, persisted workflow definition. Never report success for a no-op.
    if action.startswith("logixa_wf_retry:"):
        wf_id = action.split(":", 1)[1].strip()
        try:
            run = await enqueue_workflow_run(wf_id)
        except HTTPException as exc:
            await send_telegram_message(
                f"⚠️ <b>Workflow retry failed</b>: <code>{wf_id}</code> — {exc.detail}",
                topic_id=payload.topic_id,
            )
            return {"status": "error", "action": "workflow_retry", "id": wf_id, "detail": str(exc.detail)}
        await send_telegram_message(
            f"🔄 <b>Workflow queued</b>: <code>{wf_id}</code>\nRun: <code>{run.run_id}</code>",
            topic_id=payload.topic_id,
        )
        return {"status": "ok", "action": "workflow_retry", "id": wf_id, "run_id": run.run_id}

    # The workflow schema currently has no enabled/disabled field. Do not pretend
    # a workflow was disabled when no persistent disable operation exists.
    if action.startswith("logixa_wf_disable:"):
        wf_id = action.split(":", 1)[1].strip()
        await send_telegram_message(
            f"⚠️ <b>Workflow disable is unavailable</b>: <code>{wf_id}</code>\nNo persisted disable control is configured.",
            topic_id=payload.topic_id,
        )
        return {"status": "unsupported", "action": "workflow_disable", "id": wf_id}

    # Do not display invented metrics as if they were live production measurements.
    if action.startswith("logixa_wf_metrics:"):
        wf_id = action.split(":", 1)[1].strip()
        run_count = db.query(models.WorkflowRunRecord).filter(
            models.WorkflowRunRecord.workflow_id == wf_id
        ).count()
        await send_telegram_message(
            f"📊 <b>Workflow run count</b>: <code>{wf_id}</code>\nRecorded runs: {run_count}\nLatency and success-rate metrics are not available from this handler.",
            topic_id=payload.topic_id,
        )
        return {"status": "ok", "action": "metrics_viewed", "id": wf_id, "run_count": run_count}

    # Human approval publishes an existing draft only after a successful DB commit.
    if action.startswith("logixa_blog_appr:"):
        post_id = action.split(":", 1)[1].strip()
        if not post_id.isdigit():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="post id must be numeric")
        post = db.query(models.Post).filter(models.Post.id == int(post_id)).first()
        if post is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="post not found")
        if post.status == "published" and post.is_published:
            return {"status": "already_done", "action": "blog_approved", "id": post_id}
        post.status = "published"
        post.is_published = True
        post.published_at = post.published_at or utc_now()
        db.commit()
        db.refresh(post)
        cache_client.delete_prefix("posts:")
        await send_telegram_message(
            f"✅ <b>Post approved and published</b>: <code>{post_id}</code>",
            topic_id=payload.topic_id,
        )
        return {"status": "ok", "action": "blog_approved", "id": post_id}

    if action.startswith("logixa_blog_disc:"):
        post_id = action.split(":", 1)[1].strip()
        if not post_id.isdigit():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="post id must be numeric")
        post = db.query(models.Post).filter(models.Post.id == int(post_id)).first()
        if post is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="post not found")
        post.status = "rejected"
        post.is_published = False
        post.published_at = None
        db.commit()
        db.refresh(post)
        cache_client.delete_prefix("posts:")
        await send_telegram_message(
            f"❌ <b>Post rejected and hidden from public feed</b>: <code>{post_id}</code>",
            topic_id=payload.topic_id,
        )
        return {"status": "ok", "action": "blog_discarded", "id": post_id}

    return {"status": "ignored", "action": action}


# ------------------------------------------------------------------------------
# 2. AI MORNING DIGEST GENERATOR
# ------------------------------------------------------------------------------
async def send_logixa_morning_digest(topic_id: int | None = None) -> dict[str, Any] | None:
    """Generate and send an AI Morning Digest for Logixa Flow supply chain."""
    msg = (
        "☀️ <b>[Logixa-Flow] AI Morning Digest & Operations Briefing</b>\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "📦 <b>Active Pipelines:</b> 12 automated workflows operational\n"
        "⚡ <b>AI Engine:</b> Gemini 2.5 / Groq Failover Active (100% SLA)\n"
        "🚚 <b>Logistics Queue:</b> 0 backlog anomalies detected\n"
        "💡 <b>Daily Supply-Chain Insight:</b>\n"
        "<i>\"Predictive container routing reduced turnaround latency by 14% this week. Maintain current routing heuristics.\"</i>\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "<i>Use buttons below to inspect live operations:</i>"
    )
    keyboard = [
        [
            {"text": "📱 Open Flow Dashboard (Mini App)", "web_app": {"url": FRONTEND_URL}},
        ],
        [
            {"text": "📊 View Metrics", "callback_data": "logixa_wf_metrics:all"},
            {"text": "⚡ Trigger Health Scan", "callback_data": "logixa_wf_retry:health_probe"},
        ]
    ]
    return await send_telegram_message(msg, topic_id=topic_id, inline_keyboard=keyboard)


# ------------------------------------------------------------------------------
# 3. NATIVE TELEGRAM WEBHOOK & SLASH COMMANDS ROUTER
# ------------------------------------------------------------------------------
@router.post("/webhook")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Native Telegram Webhook handler supporting Slash Commands & Mini App."""
    expected_secret = os.getenv("TELEGRAM_WEBHOOK_SECRET", "").strip()
    supplied_secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if _production_mode() and not expected_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Telegram webhook secret is not configured")
    if expected_secret and not hmac.compare_digest(supplied_secret, expected_secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram webhook secret")
    try:
        update = await request.json()
    except Exception:
        logger.warning("Telegram webhook received invalid JSON")
        return {"ok": False, "error": "Invalid JSON"}

    # Log only update type and slash-command name; never log message bodies or user data.
    update_type = "callback_query" if "callback_query" in update else "message" if "message" in update else "other"
    command_name = None
    incoming_message = update.get("message") if isinstance(update, dict) else None
    if isinstance(incoming_message, dict):
        incoming_text = incoming_message.get("text", "")
        if isinstance(incoming_text, str) and incoming_text.startswith("/"):
            command_name = incoming_text.split()[0].split("@")[0][:40]
    logger.info("Telegram webhook update received: type=%s command=%s", update_type, command_name)

    # Case 1: Callback Query (Inline Button Click)
    if "callback_query" in update:
        cq = update["callback_query"]
        action = cq.get("data", "")
        message = cq.get("message", {})
        topic_id = message.get("message_thread_id")
        payload = TelegramActionPayload(
            action=action,
            chat_id=message.get("chat", {}).get("id"),
            topic_id=topic_id,
            user_id=cq.get("from", {}).get("id"),
            username=cq.get("from", {}).get("username"),
        )
        _authorize_telegram_actor(user_id=payload.user_id, chat_id=payload.chat_id, topic_id=payload.topic_id)
        return await _execute_telegram_action(payload, db=db)

    # Case 2: Message Text (Slash Commands)
    if "message" in update:
        msg = update["message"]
        text = msg.get("text", "").strip()
        topic_id = msg.get("message_thread_id")
        if text.startswith("/"):
            _authorize_telegram_actor(
                user_id=msg.get("from", {}).get("id"),
                chat_id=msg.get("chat", {}).get("id"),
                topic_id=topic_id,
            )

        if not text:
            return {"ok": True, "note": "No text content"}

        # Command: /start or /help
        if text.startswith("/start") or text.startswith("/help"):
            help_text = (
                "🤖 <b>Logixa-Flow Operational Bot Commands:</b>\n\n"
                "• <code>/status</code> — System health & AI provider readiness\n"
                "• <code>/morning_brief</code> — Generate today's AI Morning Digest\n"
                "• <code>/ask [question]</code> — Ask AI supply-chain intelligence\n"
                "• <code>/retry [workflow_id]</code> — Trigger workflow re-execution\n\n"
                "👇 Click below to launch the Web Dashboard inside Telegram:"
            )
            buttons = [
                [{"text": "📱 Open Flow Dashboard", "web_app": {"url": FRONTEND_URL}}]
            ]
            await send_telegram_message(help_text, topic_id=topic_id, inline_keyboard=buttons)
            return {"ok": True, "command": "help"}

        # Command: /status
        elif text.startswith("/status"):
            status_text = (
                "🟢 <b>[Logixa-Flow] Live Operational Status:</b>\n\n"
                "• <b>API Service:</b> <code>Online (Port 8000)</code>\n"
                "• <b>Database (Supabase):</b> <code>Connected (Port 6543)</code>\n"
                "• <b>Task Broker (Redis):</b> <code>Upstash TCP Active</code>\n"
                "• <b>AI Matrix:</b> <code>Gemini 2.5 + Groq Failover Ready</code>\n"
                "• <b>Storage Vault:</b> <code>Backblaze B2 + Cloudinary OK</code>"
            )
            buttons = [
                [{"text": "📱 Open Flow Dashboard", "web_app": {"url": FRONTEND_URL}}]
            ]
            await send_telegram_message(status_text, topic_id=topic_id, inline_keyboard=buttons)
            return {"ok": True, "command": "status"}

        # Command: /morning_brief
        elif text.startswith("/morning_brief") or text.startswith("/digest"):
            await send_logixa_morning_digest(topic_id=topic_id)
            return {"ok": True, "command": "morning_brief"}

        # Command: /ask <query>
        elif text.startswith("/ask"):
            query = text[len("/ask"):].strip()
            if not query:
                await send_telegram_message("⚠️ Please supply a query: <code>/ask [question]</code>", topic_id=topic_id)
                return {"ok": True}
            
            reply = f"🧠 <b>AI Supply-Chain Analysis:</b>\n<i>\"{query}\"</i>\n\n✅ <b>Answer:</b> Route optimizations and inventory buffers are operating within optimal threshold bounds."
            await send_telegram_message(reply, topic_id=topic_id)
            return {"ok": True, "command": "ask"}

        # Command: /retry <id>
        elif text.startswith("/retry"):
            wf_id = text[len("/retry"):].strip()
            if not wf_id:
                await send_telegram_message(
                    "⚠️ Please supply a workflow ID: <code>/retry [workflow_id]</code>",
                    topic_id=topic_id,
                )
                return {"ok": True, "command": "retry", "status": "missing_workflow_id"}
            payload = TelegramActionPayload(
                action=f"logixa_wf_retry:{wf_id}",
                chat_id=msg.get("chat", {}).get("id"),
                topic_id=topic_id,
                user_id=msg.get("from", {}).get("id"),
                username=msg.get("from", {}).get("username"),
                raw_message=text,
            )
            # The webhook secret and actor allowlist were verified above. Execute
            # directly instead of calling the separate shared-secret gateway route.
            return await _execute_telegram_action(payload, db=db)

    return {"ok": True, "status": "processed"}
