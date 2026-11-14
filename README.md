# ⚡ Logixa Flow
> **Autonomous Multi-Agent Workflow Engine & Real-Time Orchestration Platform**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.12-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_&_pgvector-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Gemini 2.0](https://img.shields.io/badge/Gemini-2.0_Flash-4285F4?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)
[![Groq](https://img.shields.io/badge/Groq-LPU_Inference-F55036?style=flat-square)](https://groq.com/)
[![Upstash](https://img.shields.io/badge/Upstash-Redis_&_QStash-00E599?style=flat-square&logo=upstash)](https://upstash.com/)
[![Render](https://img.shields.io/badge/Render-Backend_Live-46E3B7?style=flat-square&logo=render)](https://logixa-flow.onrender.com)
[![Vercel](https://img.shields.io/badge/Vercel-Frontend_Live-black?style=flat-square&logo=vercel)](https://logixa-flow.vercel.app)
[![Telegram](https://img.shields.io/badge/Telegram_Bot-Topic_#5-26A5E4?style=flat-square&logo=telegram)](https://t.me/)

---

## 🌟 Overview

**Logixa Flow** is an enterprise-grade multi-agent autonomous execution system. It orchestrates intelligent LLM agents across complex multi-step pipelines, automated data synthesis, document validation, and asynchronous task delivery.

Designed with a high-throughput Python FastAPI backend running on Render and a responsive Next.js 15 command center hosted on Vercel.

---

## 🚀 Key Features

* **🤖 Multi-Agent Orchestration**: Autonomous agent pipelines powered by Gemini 2.0 Flash, Groq Whisper/LLaMA 3.3, and OpenRouter fallbacks.
* **🧠 Vector Memory & RAG**: Semantic vector retrieval powered by Supabase `pgvector` and Voyage AI embeddings.
* **⚡ Asynchronous Queue Engine**: Celery & Upstash Redis/QStash background worker execution with automatic retries and dead-letter handling.
* **📊 Visual Workflow Designer**: Real-time interactive pipeline builder and execution tracer.
* **🛡️ Enterprise Governance**: Role-based access control, cryptographic webhook signatures, and automated audit logging.
* **📲 Dedicated Telegram Ops Bot**: Direct pipeline triggering, status inspections, and live system alerts in Topic `#5`.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────┐       ┌──────────────────────────────────┐
│      Next.js 15 Command UI      │       │     Dedicated Telegram Bot       │
│      (Vercel Production)        │       │         (Topic #5 Ops)           │
└────────────────┬────────────────┘       └────────────────┬─────────────────┘
                 │                                         │
                 ▼                                         ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    FastAPI Core Engine (Render Cloud)                      │
│   • Asynchronous Agent Dispatcher & Pipeline Executor                      │
│   • LLM Router: Gemini 2.0 Flash ➔ Groq ➔ OpenRouter (Tiered Fallbacks)   │
│   • Vector Knowledge Ingestion & Hybrid RAG Retrieval                      │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                       Data & Background Services                           │
│   • Supabase PostgreSQL (pgvector, Session Pooler, RLS Guardrails)         │
│   • Upstash Redis REST & Celery Broker (Real-time Message Bus)              │
│   • Cloudinary CDN & Backblaze B2 (Artifact & Document Vault)              │
│   • Sentry & Axiom Observability Pipeline                                  │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quickstart

```bash
# 1. Backend Setup
cd apps/web-platform/backend
python -m venv .venv
source .venv/bin/activate  # Or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 2. Frontend Setup
cd ../frontend
pnpm install
pnpm dev
```

---

## 🔒 Security & Isolation

* **Strict Sandbox Isolation**: Zero cross-project dependencies or runtime shared states.
* **Secure Webhook Verification**: All incoming webhooks verified with SHA256 HMAC tokens.

---

## 📜 License

Private Enterprise License. All Rights Reserved.
