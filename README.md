# Logixa Flow

**AI-Powered Supply Chain Intelligence and Workflow Automation Platform**

Logixa Flow is a full-stack platform for supply-chain intelligence, AI-assisted research and drafting, knowledge retrieval, content review/publishing, and durable workflow automation. It combines a public knowledge website, a private admin control plane, an AI/RAG layer, workflow orchestration, scheduled/background processing, file/object storage, analytics, and operational tooling.

## What the platform is for

Logixa Flow is designed to turn supply-chain information and operational inputs into reviewable intelligence and repeatable automated workflows:

`Source / File / User Input → Ingestion → RAG / AI → Review / Decision → Workflow → Action → Analytics`

It is not only a blog, chatbot, RSS scraper, CMS, or workflow editor. Those are subsystems of the larger platform.

## Core capabilities

### AI and knowledge
- Public and admin AI chat experiences.
- AI agent runs for research/generation with persisted run and step records.
- AI Memory / Brain for reviewable generated intelligence.
- Confidence, hallucination, and feedback quality signals.
- Multi-provider LLM routing with fallback.
- Google Gemini embeddings and generation.
- OpenRouter, Groq, Cerebras, Mistral, Cohere, NVIDIA NIM, and local fallback providers are represented in the backend router; provider availability depends on configured production credentials.
- RAG ingestion, chunking, embeddings, PostgreSQL/pgvector storage, similarity search, source-grounded context, feedback, metrics, retry/error handling, and alerting.

### Workflow automation
- Visual workflow administration using the frontend workflow UI.
- Canonical backend workflow implementation: `web-platform/backend/app/routers/workflow.py`.
- Dependency-aware node execution.
- Registered actions such as logging and metadata operations.
- Human approval nodes with pause/resume lifecycle.
- Retry and timeout handling.
- Durable workflow definitions and run state in PostgreSQL.
- Scheduled workflow jobs, queue prioritization, controller-triggered execution, execution history, telemetry, and restart recovery.
- Workflow/controller behavior is covered by backend tests.

### Source intelligence and content
- Intelligence source registry with source type/category/trust information.
- RSS/feed collection and duplicate detection.
- Automatic RAG ingestion after configured feed synchronization.
- CMS for articles, drafts, categories, and publishing.
- Human review before publication-sensitive AI output is exposed publicly.
- Optional `agents/` background pipeline for collection → writing → management → publishing; it is separate from the main FastAPI web service.

### Business and operations
- Logistics estimator using vehicle dimensions/capacity, carton dimensions, quantity, volume, and weight.
- Finance and operational tracking.
- AI/API usage and cost logging.
- Analytics and event tracking.
- Subscriber/newsletter and email-template management.
- User submissions and threaded/moderation-oriented engagement features.

### Import and file handling
- Admin bulk import endpoint: `POST /api/admin/imports`.
- CSV, XLSX, and PDF import support.
- File-size and row-count limits.
- Imported knowledge is stored in AI Memory and can create draft posts for review.
- Image/thumbnail/icon uploads route to Cloudinary up to 10 MB, documents to Supabase Storage up to 50 MB, and larger files to Backblaze B2 up to 5 GB. Google Drive is used for exports and workflow backup artifacts.
- RAG also supports batch file ingestion with per-file status/recovery reporting.

## Architecture

```
User
  ↓
Next.js / React frontend
  ↓ HTTPS / API
FastAPI backend
  ├── Authentication / admin authorization
  ├── AI chat + agent layer
  ├── LLM router + provider fallback
  ├── RAG ingestion/search
  ├── Workflow engine
  ├── Scheduler / controllers
  ├── CMS / source intelligence
  ├── Uploads / integrations
  └── Analytics / usage / operations
        ↓
Supabase PostgreSQL
  ├── Application data
  ├── Workflow definitions/runs
  ├── AI memory
  └── pgvector embeddings
        ↓
Object storage / external providers
  ├── Backblaze B2 / S3-compatible storage
  ├── Gemini and other LLM providers
  └── RSS / external sources
```

## Technology stack

### Frontend
- Next.js 15.5.27
- React 19
- TypeScript
- `@xyflow/react` for workflow UI
- Vercel production deployment

### Backend
- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- SlowAPI rate limiting
- JWT/admin security layer
- Background scheduler/worker components

### Data
- PostgreSQL through Supabase
- Row Level Security (RLS)
- pgvector 0.8.2
- Durable workflow tables and execution history

### AI
- Google Gemini
- Multi-provider LLM router
- Embeddings
- RAG
- AI Memory / Brain
- Agent runs
- Usage/cost telemetry

### Storage and integrations
- Cloudinary / Supabase Storage / Backblaze B2 storage routing
- Google Drive exports and workflow backup artifacts
- Upstash Redis
- QStash for durable delivery/scheduling
- Celery + Redis for long-running workflow execution
- RSS feeds
- Email integration

### DevOps
- GitHub
- CI/CD
- Dependabot
- Vercel for frontend
- Render for backend
- Supabase for PostgreSQL

## Security and reliability

- Alembic migration `20261003_0005` defines the RLS/grant baseline; `20261003_0006` reconciles the current backend model schema and applies that baseline to the resulting application tables. Production migration application and live Supabase privileges have not been verified.
- Apply backend schema changes with `python -m alembic upgrade head` from `web-platform/backend` before starting the API. Startup checks that the database is at Alembic head and fails otherwise; it does not create or repair schema.
- Migration `20261003_0006` is intentionally forward-only; use a corrective forward migration rather than downgrading application data. For an unversioned legacy database, inventory and verify that its schema includes the effects of revision `20260902_0004` before explicitly stamping that revision, then run `python -m alembic upgrade head`. Never stamp `20261003_0005` unless its RLS/grant migration has actually run. `web-platform/frontend/src/lib/migrations.sql` is an unreferenced legacy artifact, not an active schema source.
- API rate limiting is enabled.
- AI/provider secrets remain backend-side; the frontend uses public configuration only.
- Admin endpoints use the backend authorization dependency.
- Uploads validate allowed image types and require admin authorization; B2/S3 uploads validate required storage configuration.
- Admin bulk imports enforce a 10 MB file limit and a 5,000-row limit.
- Remote image access was hardened by removing an unrestricted Next.js image wildcard.
- Dependency updates and CI verification are part of the release workflow.
- pgvector was moved from the public schema to the dedicated `extensions` schema.
- Workflow execution persists state to PostgreSQL and includes restart recovery.
- LLM provider errors are sanitized before logging to reduce secret leakage risk.

## Deployment

- **Frontend:** Vercel is optional and must remain off unless explicitly authorized; `web-platform/frontend/vercel.json` has been removed so it cannot override the build configuration.
- **Backend:** Render — https://logixa-flow.onrender.com
- **Database:** Supabase PostgreSQL + pgvector
- **Object storage:** Cloudinary → Supabase Storage → Backblaze B2 according to file class; Google Drive for exports/backups.
- **Workflow dispatch:** QStash → Celery + Redis.
- **Source control:** GitHub

## Local development

Backend:

```powershell
cd web-platform\backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd web-platform\frontend
npm install
npm run dev -- -p 3000
```

Checks:

```powershell
cd web-platform\frontend
npm run build

cd ..\backend
python -m pytest -q

git diff --check
git status --short
```

## Documentation map

- `PROJECT_OVERVIEW.md` — product, architecture, capabilities, status, and operational boundaries.
- `docs/AI_AGENTS_SETUP.md` — AI provider, worker, security, and onboarding guidance.
- `docs/DEPLOY_CHECKLIST.md` — deployment/repository hygiene checklist.
- `web-platform/docs/RAG_ERROR_REPORTING.md` — RAG error/retry/monitoring behavior.

## Current production status

The main branch contains the production hardening work completed so far. Render backend startup has been verified and the production database is at Alembic revision `20261005_0010`.

The remaining release gates are explicit: latest-main CI must be green; real Cloudinary/Supabase Storage/B2/Google Drive provider E2E must pass; the actual Render Celery Worker service must exist and execute a QStash-dispatched workflow; and operational recovery/observability checks must pass. These are not marked complete until live evidence exists.

Vercel is governed by the operational lock in `SECURITY.md`: if it is disabled, it must stay disabled until explicit project-owner authorization.

## Engineering principles

1. Keep `backend/app/routers/workflow.py` as the canonical workflow implementation.
2. Do not create a second workflow engine when extending orchestration behavior.
3. Persist workflow definitions and run state; do not rely on process memory as the source of truth.
4. Keep AI/provider secrets out of the frontend.
5. Preserve explicit human approval for publication-sensitive AI output.
6. Ground intelligence generation in source data/RAG where applicable.
7. Keep public-user AI and admin AI roles/configuration separable.
8. Treat AI output as reviewable intelligence, not automatically trusted truth.
9. When changing workflow behavior, update persistence/recovery and tests together.
10. When changing RAG behavior, consider ingestion, embedding, retrieval, quality, telemetry, and failure handling together.
11. Prefer existing Workflow/Controller architecture for new automation.
12. For content automation, prefer Source → RAG → Agent → Brain → Approval → Publish.
