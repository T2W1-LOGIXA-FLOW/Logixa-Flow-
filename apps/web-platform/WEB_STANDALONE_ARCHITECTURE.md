# 🌐 Logixa Flow — Web-Only Command Center Architecture

## System Specialization: Web-Only

Logixa Flow is explicitly architected and maintained as a **Pure Web Platform** (Desktop & Mobile Browser responsive, with no standalone native mobile application required).

### Core Web Surfaces:

1. **Public Intelligence Surface:**
   - Real-time supply-chain intelligence, market analytics, freight rate estimators, and public knowledge RAG.
   - Fully optimized for desktop and mobile web viewports.

2. **Admin Command Center:**
   - **Visual Workflow Node Builder:** ReactFlow (`@xyflow/react`) canvas located at `/admin/workflow` with real-time status telemetry (`orchestrator`, `research`, `media`, `finance`, `outbound`).
   - **Autonomous Agent Operations:** Agent chat console, recovery monitoring, and human-in-the-loop action approval at `/admin/agent-chat` and `/admin/agents`.
   - **RAG & Knowledge Brain:** Knowledge source ingestion, chunking, and Voyage AI embedding administration.
   - **Cost & Token Telemetry:** LLM API token accounting and usage analytics at `/admin/costs` and `/admin/usage`.

### Local Runtime:
- **Frontend (Next.js):** `http://localhost:3000`
- **Backend (FastAPI):** `http://localhost:8000`
