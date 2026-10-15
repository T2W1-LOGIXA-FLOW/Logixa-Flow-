# Telegram Integration Guide: Logixa-Flow

> **Project:** Logixa Flow (AI Supply-Chain Intelligence & Workflow Automation)  
> **Directory:** `thuwon.aionly@gmail.com\Logixa-Flow-`  
> **Runtime / Stack:** FastAPI (Python), Render  
> **Primary Topic:** `📦 Logixa-Flow`

---

## 1. Overview & Topic Role

Logixa Flow uses the Telegram Supergroup to deliver mission-critical operational intelligence:
* Workflow execution success, timing, and step breakdown.
* Failure alarms with direct inline retry actions.
* Supply-chain threshold anomaly warnings (inventory low, shipping delays).
* Controller state changes and scheduled task triggers.

Operators can retry failed workflows or pause automation controllers directly from Telegram.

---

## 2. Topic Configuration

* **Suggested Topic Name:** `📦 Logixa-Flow`
* **Suggested Topic ID:** `4` (or your assigned `message_thread_id`)
* **Color / Icon:** 📦 Package / Workflow Automation

---

## 3. Environment Variables

Configure these variables in `apps/web-platform/backend/.env` or in the Render Dashboard:

| Key | Type | Default | Description |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | String (Secret) | `""` | Bot token provided by `@BotFather` |
| `TELEGRAM_CHAT_ID` | String | `""` | Supergroup ID (e.g. `-100xxxxxxxxxx`) |
| `TELEGRAM_TOPIC_ID` | Integer | `None` | Thread ID for `#Logixa-Flow` topic |
| `TELEGRAM_ENABLED` | Boolean | `false` | Master toggle (`true` to enable delivery) |

---

## 4. Code Architecture

* **Service Module:** `apps/web-platform/backend/app/services/telegram.py`
* **Configuration:** `apps/web-platform/backend/app/config.py` (`telegram_configured`, `telegram_enabled`)
* **Template:** `apps/web-platform/backend/.env.example`

---

## 5. Available Action Hooks & API

### (1) Workflow Completed Notification
```python
from app.services.telegram import notify_workflow_completed

await notify_workflow_completed(
    workflow_id="wf_import_sync_09",
    name="Automated Cargo Manifest Ingestion",
    execution_time=4.12
)
```
* **Actions included:**
  - `[📊 View Run Metrics]` (`logixa_wf_metrics:wf_import_sync_09`)

### (2) Workflow Failed Alert
```python
from app.services.telegram import notify_workflow_failed

await notify_workflow_failed(
    workflow_id="wf_import_sync_09",
    name="Automated Cargo Manifest Ingestion",
    error_message="Upstream API rate limit reached (HTTP 429)"
)
```
* **Actions included:**
  - `[🔄 Retry Workflow]` (`logixa_wf_retry:wf_import_sync_09`)
  - `[🛑 Disable Workflow]` (`logixa_wf_disable:wf_import_sync_09`)

### (3) Supply Chain Threshold Alert
```python
from app.services.telegram import notify_supply_chain_alert

await notify_supply_chain_alert(
    metric="Port of Yangon Dwell Time",
    current_value="6.4 days",
    threshold="4.0 days",
    notes="Customs clearance queue extended due to holiday schedule."
)
```

### (4) Controller Lifecycle Update
```python
from app.services.telegram import notify_controller_status

await notify_controller_status(
    controller_name="NightlySyncController",
    state="PAUSED",
    reason="Manual administrative pause triggered by admin"
)
```

---

## 6. Cloud Deployment Checklist (Render)

1. Open Render dashboard -> Logixa backend service.
2. Go to **Environment** tab.
3. Add `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_TOPIC_ID`, and set `TELEGRAM_ENABLED=true`.
4. Deploy the service.

---

## 7. Inbound Action Handler API

This project includes a dedicated inbound endpoint to receive callbacks from the Central Cloudflare Gateway:
* **Endpoint:** `POST /api/telegram/action`
* **Supported Actions:**
  * `logixa_wf_retry:<id>` -> Triggers immediate background retry for failed workflow
  * `logixa_wf_disable:<id>` -> Pauses the workflow scheduler and marks state as disabled
  * `logixa_wf_metrics:<id>` -> Replies with live runtime execution metrics in the topic

---

## 8. AI Provider & API Keys Configuration

| Provider | Environment Key | Primary Role in Logixa Flow | Free / Paid Notes |
|---|---|---|---|
| **Gemini** | `GEMINI_API_KEY` | Public supply-chain AI assistant & RAG summaries | Needs VPN in MM; excellent Burmese fluency |
| **OpenRouter** | `OPENROUTER_API_KEY` | Free model fallback (`openrouter/free`) | 50 req/day free tier |
| **Groq** | `GROQ_API_KEY` | High-speed cargo & shipping manifest extraction | `qwen/qwen3.8-27b` (14,400 req/day free) |
| **NVIDIA Build** | `NVIDIA_NIM_API_KEY` | Enterprise supply-chain reasoning agents | `meta/llama-3.1-8b-instruct` |
| **Mistral** | `MISTRAL_API_KEY` | Complex customs regulations & structured data | `mistral-small-latest` |
| **Cohere** | `COHERE_API_KEY` | Reranking retrieved knowledge chunks | `command-r-plus` / `command-a-03-2025` |
| **Voyage** | `VOYAGE_API_KEY` | Supply-chain knowledge RAG vector embeddings | `voyage-3-lite` (512-dim vector) |
| **Cloudflare** | `CLOUDFLARE_API_TOKEN`<br>`CLOUDFLARE_ACCOUNT_ID` | Workers AI edge execution | 100k free req/day |
| **Hugging Face** | `HUGGINGFACE_API_KEY` | Local moderation models (`distilbert-sst-2`) | Inference API disabled (Oct 8); Hub/Spaces only |

---

## 9. Tuned Fallback Chains & AI Monitoring

### 💬 Chat & Supply Chain Workflow Chain
1. 🥇 **Groq (`qwen/qwen3.8-27b`)** — Primary for sub-second manifest parsing & logistics data (14,400 req/day free).
2. 🥈 **Mistral (`codestral-latest`)** — Unrivaled structured JSON & workflow logic generation.
3. 🥉 **Cloudflare Workers AI (`llama-3.1-8b`)** — Serverless operational resilience.
4. 4️⃣ **Gemini 2.5/3.5-flash** — Burmese shipping customer queries.
5. 5️⃣ **OpenRouter (Free tier)** — Emergency fallback.

### 📚 Supply Chain RAG (512-D Vector)
1. 🥇 **Voyage AI (`voyage-3-lite`, 512-D)**
2. 🥈 **Cohere (`embed-v4.0`, 512-D)**
3. 🥉 **Deterministic Hash Fallback (512-D)**

### 📊 Real-Time AI Usage & Health API
* **Endpoint:** `GET /api/ai/usage`
* **Telegram Command:** Send `/ai_status` or click `[🔄 Refresh Usage]` in Telegram to check live provider health and API usage.


