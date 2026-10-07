# Logixa Flow — Project Overview

> Owner: Project / Engineering
> Update when: product architecture, subsystem boundaries, or durable design decisions change
> Last Updated: 2026-10-08
> Do NOT put here: current release status, release-gate tracking, deployment checklists, or security policy.

## 1. Identity

Logixa Flow is an AI-powered supply-chain intelligence and workflow automation platform combining a public knowledge website, private admin control plane, AI/RAG, human-reviewed content, durable workflows, scheduling/controllers, storage integrations, and operational tools.

Core product loop:

Source / File / User Input → Ingestion → RAG / AI → Review / Decision → Workflow → Action → Analytics

## 2. Product surfaces

Public: supply-chain knowledge/content, published articles, and a feature-gated public AI surface.

Admin: command center, knowledge/RAG, AI operations, Brain review, agents, content, workflows/controllers, analytics, operations, estimator, finance, and settings.

## 3. Core subsystems

### Source intelligence

IntelligenceSource registry, manual/file/URL/RSS sources, source categories/trust metadata, RSS synchronization, duplicate detection, and source metadata feeding RAG/agent layers.

### RAG knowledge layer

Ingestion under web-platform/backend/app/rag/, chunking, Gemini embeddings, PostgreSQL/pgvector, source-aware retrieval, batch ingestion, error/retry handling, correlation IDs, aggregate metrics, alerts, and quality/evaluation hooks.

### AI layer

Public chat, admin chat, persisted agent runs/steps, AI Memory/Brain, confidence/hallucination signals, reviewer feedback, and multi-provider routing. Provider status is documented in docs/AI_RAG.md.

### Workflow orchestration

Canonical implementation: web-platform/backend/app/routers/workflow.py. It covers workflow definitions/nodes, dependency ordering, registered actions, retry/timeout behavior, approval nodes, pause/resume, queues/priorities, durable run records, scheduled jobs, controller-triggered execution, execution history/metrics, and restart/pending-run recovery.

PostgreSQL is the durable source of truth. Do not create a second workflow engine.

### Scheduler/controllers

Scheduled workflow records, queue scheduling/delay support, controller configuration, and controller execution routed into the canonical workflow engine.

### Content/CMS

Posts, drafts, categories, publication state, Brain-to-draft flows, review, and publishing. Publication-sensitive AI remains reviewable.

### Background agent pipeline

The agents/ directory contains a secondary collector → writer → manager → publisher pipeline. It is separate from the canonical workflow engine.

### Business and operations

Logistics estimator, finance, analytics/event tracking, AI/API usage and cost tracking, email/newsletter, submissions, and moderation-oriented features.

### File and import layer

POST /api/admin/imports supports CSV/XLSX/PDF paths. The documented import-file limit is 10 MB and the tabular row limit is 5,000. Storage routing is documented in docs/STORAGE.md.

## 4. Data model and taxonomy

Post types are news, education, and analysis; post publication state is represented by draft/published plus publication fields. Brain states include pending, approved, rejected, and published. Knowledge-source categories/types and lifecycle states are separate from post taxonomy and should not be conflated.

## 5. Technology and integration model

Frontend: Next.js/React/TypeScript with @xyflow/react.

Backend: Python/FastAPI/Uvicorn/SQLAlchemy/SlowAPI with JWT/admin authorization.

Data: PostgreSQL/Supabase, pgvector, Alembic.

AI: Gemini and multi-provider LLM routing, embeddings, RAG, Brain, agent runs, usage/cost telemetry.

Automation: canonical workflow engine, scheduler/controllers, optional agents/ pipeline.

Storage/integrations: Cloudinary, Supabase Storage, Backblaze B2/S3-compatible storage, Google Drive, QStash, optional Celery/Redis, RSS, and email integrations.

## 6. Architectural decisions

- workflow.py remains the canonical workflow engine.
- PostgreSQL is durable workflow/run state.
- QStash is the durable external delivery mechanism for the current Render Free path.
- Render Free uses one Web Service; a Background Worker is not a current prerequisite.
- CELERY_ENABLED=false is intentional in the current Free configuration; Celery/Redis remain optional when explicitly enabled.
- Backend owns application DB access; frontend must not receive service-role credentials.
- RLS is defense-in-depth and not a replacement for API authorization.
- Schema changes use Alembic; forward corrective migrations are preferred for application data.
- frontend/src/lib/migrations.sql is legacy/unreferenced and not an active schema source.
- Public AI and admin AI are independent.
- Backend AI gating is authoritative.
- Provider secrets remain backend-side.
- Human approval remains required for publication-sensitive AI output.
- Vercel override configuration was intentionally removed; re-enable requires explicit owner authorization.

## 7. Documentation ownership

Current status belongs in CURRENT_STATE.md. Roadmap and gates belong in ROADMAP.md. UI rules belong in UI_DESIGN_SYSTEM.md. Working protocol belongs in TOOL.md. Security policy belongs in SECURITY.md. Detailed domain reference belongs in docs/.
