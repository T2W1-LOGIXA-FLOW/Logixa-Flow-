from __future__ import annotations

import logging
import os
from typing import Any
import httpx

from ..config import clean_env_value, telegram_configured, telegram_enabled

logger = logging.getLogger("logixa.telegram")

TELEGRAM_API_BASE = "https://api.telegram.org"


def _get_telegram_credentials() -> tuple[str, str, int | None]:
    token = clean_env_value("TELEGRAM_BOT_TOKEN")
    chat_id = clean_env_value("TELEGRAM_CHAT_ID")
    topic_str = clean_env_value("TELEGRAM_TOPIC_ID")
    topic_id = int(topic_str) if topic_str.isdigit() else None
    return token, chat_id, topic_id


async def send_telegram_message(
    text: str,
    *,
    topic_id: int | None = None,
    chat_id: int | str | None = None,
    use_default_topic: bool = True,
    parse_mode: str = "HTML",
    inline_keyboard: list[list[dict[str, str]]] | None = None,
    disable_web_page_preview: bool = False,
) -> dict[str, Any] | None:
    """Send an asynchronous message to Telegram group/topic for Logixa Flow."""
    token, configured_chat_id, default_topic = _get_telegram_credentials()
    effective_chat_id = chat_id if chat_id is not None else configured_chat_id
    effective_topic = topic_id if topic_id is not None else (default_topic if use_default_topic else None)

    if not token or not effective_chat_id:
        logger.info("[Telegram:Logixa:DryRun] %s", text.replace("\n", " "))
        return None

    if not telegram_enabled():
        logger.debug("[Telegram:Logixa:Disabled] %s", text.replace("\n", " "))
        return None

    url = f"{TELEGRAM_API_BASE}/bot{token}/sendMessage"
    payload: dict[str, Any] = {
        "chat_id": effective_chat_id,
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": disable_web_page_preview,
    }

    if effective_topic:
        payload["message_thread_id"] = int(effective_topic)

    if inline_keyboard:
        payload["reply_markup"] = {"inline_keyboard": inline_keyboard}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            if response.status_code != 200:
                logger.error("Telegram API error (%s): %s", response.status_code, response.text)
                return None
            return response.json()
    except Exception as exc:
        logger.warning("Failed to send Telegram message from Logixa Flow: %s", type(exc).__name__)
        return None


async def send_notification(
    title: str,
    details: str,
    *,
    status: str = "INFO",
    topic_id: int | None = None,
    actions: list[tuple[str, str]] | None = None,
) -> dict[str, Any] | None:
    """Send standardized Logixa Flow workflow / supply-chain notification."""
    icon_map = {
        "SUCCESS": "✅",
        "INFO": "📦",
        "WARNING": "⚠️",
        "ERROR": "🚨",
    }
    status_icon = icon_map.get(status.upper(), "📦")

    lines = [
        f"📦 <b>[Logixa-Flow]</b> {status_icon} <b>{title}</b>",
        "",
        details,
    ]
    text = "\n".join(lines)

    inline_keyboard = None
    if actions:
        row: list[dict[str, str]] = []
        for label, callback_or_url in actions:
            if callback_or_url.startswith("http://") or callback_or_url.startswith("https://"):
                row.append({"text": label, "url": callback_or_url})
            else:
                row.append({"text": label, "callback_data": callback_or_url})
        inline_keyboard = [row]

    return await send_telegram_message(text, topic_id=topic_id, inline_keyboard=inline_keyboard)


# ==========================================
# Logixa Flow Domain Hooks
# ==========================================

async def notify_workflow_completed(workflow_id: str, name: str, execution_time: float) -> None:
    """Notify when a supply chain workflow completes successfully."""
    details = f"⚡ <b>Workflow:</b> <code>{name}</code>\n⏱️ <b>Duration:</b> {execution_time:.2f}s\n🆔 <code>{workflow_id}</code>"
    actions = [
        ("📊 View Run Metrics", f"logixa_wf_metrics:{workflow_id}"),
    ]
    await send_notification("Workflow Finished", details, status="SUCCESS", actions=actions)


async def notify_workflow_failed(workflow_id: str, name: str, error_message: str) -> None:
    """Notify when a workflow fails and requires intervention."""
    details = f"⚠️ <b>Workflow:</b> <code>{name}</code>\n❌ <b>Error:</b> {error_message}\n🆔 <code>{workflow_id}</code>"
    actions = [
        ("🔄 Retry Workflow", f"logixa_wf_retry:{workflow_id}"),
        ("🛑 Disable Workflow", f"logixa_wf_disable:{workflow_id}"),
    ]
    await send_notification("Workflow Execution Failed", details, status="ERROR", actions=actions)


async def notify_supply_chain_alert(metric: str, current_value: str, threshold: str, notes: str = "") -> None:
    """Trigger alert when a supply-chain threshold is breached."""
    details = (
        f"📈 <b>Metric:</b> {metric}\n"
        f"⚠️ <b>Current:</b> <code>{current_value}</code> (Threshold: {threshold})"
    )
    if notes:
        details += f"\n📝 {notes}"
    await send_notification("Supply Chain Threshold Alert", details, status="WARNING")


async def notify_controller_status(controller_name: str, state: str, reason: str = "") -> None:
    """Notify controller lifecycle change."""
    details = f"🎮 <b>Controller:</b> <code>{controller_name}</code>\n📍 <b>State:</b> <code>{state}</code>"
    if reason:
        details += f"\n💬 {reason}"
    await send_notification("Controller State Update", details, status="INFO")


async def configure_telegram_webhook() -> bool:
    """Register the service webhook with Telegram when production settings permit it."""
    token = clean_env_value("TELEGRAM_BOT_TOKEN")
    secret = clean_env_value("TELEGRAM_WEBHOOK_SECRET")
    if not telegram_enabled():
        logger.warning("Telegram webhook registration skipped: TELEGRAM_ENABLED is not enabled")
        return False
    if not token or not secret:
        logger.warning("Telegram webhook registration skipped: bot token or webhook secret is not configured")
        return False

    base_url = clean_env_value("TELEGRAM_WEBHOOK_URL") or clean_env_value("RENDER_EXTERNAL_URL")
    if not base_url:
        logger.warning("Telegram webhook registration skipped: TELEGRAM_WEBHOOK_URL and RENDER_EXTERNAL_URL are empty")
        return False
    base_url = base_url.rstrip("/")
    webhook_url = base_url if base_url.endswith("/api/telegram/webhook") else base_url + "/api/telegram/webhook"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                TELEGRAM_API_BASE + "/bot" + token + "/setWebhook",
                json={"url": webhook_url, "secret_token": secret, "allowed_updates": ["message", "callback_query"]},
            )
        if response.status_code != 200:
            logger.warning("Telegram webhook registration failed with HTTP %s", response.status_code)
            return False
        result = response.json()
        if not result.get("ok"):
            logger.warning("Telegram webhook registration rejected by Telegram API")
            return False
        logger.info("Telegram webhook registered successfully for %s", webhook_url)
        # Read back Telegram's effective webhook state without logging credentials.
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                info_response = await client.get(TELEGRAM_API_BASE + "/bot" + token + "/getWebhookInfo")
            info_payload = info_response.json() if info_response.status_code == 200 else {}
            info = info_payload.get("result", {}) if info_payload.get("ok") else {}
            logger.info(
                "Telegram webhook state: configured=%s pending_updates=%s last_error_date=%s last_error=%s allowed_updates=%s",
                bool(info.get("url")),
                info.get("pending_update_count"),
                info.get("last_error_date"),
                info.get("last_error_message"),
                info.get("allowed_updates"),
            )
            async with httpx.AsyncClient(timeout=10.0) as client:
                me_response = await client.get(TELEGRAM_API_BASE + "/bot" + token + "/getMe")
            me_payload = me_response.json() if me_response.status_code == 200 else {}
            me = me_payload.get("result", {}) if me_payload.get("ok") else {}
            logger.info("Telegram bot identity: username=%s can_join_groups=%s", me.get("username"), me.get("can_join_groups"))
        except Exception as exc:
            logger.warning("Telegram webhook state check failed: %s", type(exc).__name__)
        return True
    except Exception as exc:
        logger.warning("Telegram webhook registration failed: %s", type(exc).__name__)
        return False
