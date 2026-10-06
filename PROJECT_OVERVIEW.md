# Logixa Flow — Project Overview

## 1. Identity

**Name:** Logixa Flow  
**Type:** AI-Powered Supply Chain Intelligence and Workflow Automation Platform  
**Product shape:** Public knowledge website + private admin control plane + AI/RAG + workflow automation + operational tools  
**Source of truth:** GitHub `main` branch  
**Frontend deployment:** Vercel only when explicitly enabled  
**Production backend:** Render  
**Database:** Supabase PostgreSQL + pgvector  
**Object storage:** Cloudinary → Supabase Storage → Backblaze B2, with Google Drive for exports/backups

## 2. Purpose

Logixa Flow is intended to make supply-chain information and operational inputs usable as reviewable intelligence and repeatable automation.

The core product loop is:

`Source / File / User Input → Ingestion → RAG / AI → Review / Decision → Workflow → Action → Analytics`

The platform is deliberately broader than any one feature. Blog/content, RSS collection, chat, agents, RAG, workflow editing, scheduling, business tools, and administration are coordinated parts of one system.

## 3. Product surfaces

### Public surface
- Supply-chain and logistics knowledge/content.
- Public articles and publishing output.
- Public AI/agent experience where enabled.
- Public-facing site built with Next.js.

### Admin surface
- Command center/dashboard.
- Knowledge sources, feeds, RAG index, and Brain review.
- Agent runs and admin AI chat.
- Articles, drafts, content review, submissions, email.
- Workflow and controllers.
- Analytics, usage, AI costs, system health.
- Estimator, finance, and settings.

The current admin sidebar is already organized around these mental-model groups: Command Center, Knowledge, AI Operations, Content, Automation, Operations, and Tools.

## 4. Core subsystems

### A. Source intelligence
- `IntelligenceSource` registry.
- Manual/file/URL/RSS source types.
- Supply-chain-oriented source categories.
- Trust-level information.
- RSS synchronization and duplicate detection.
- Source metadata feeds the RAG and agent layers.

### B. RAG knowledge layer
- Ingestion under `web-platform/backend/app/rag/`.
- Chunking and embedding.
- Gemini embeddings.
- PostgreSQL + pgvector.
- Similarity search and context construction.
- Source-aware retrieval.
- Batch ingestion progress.
- Error classification and retries.
- Correlation IDs, metrics, alert thresholds, and feedback.
- RAG quality/evaluation hooks.

### C. AI layer
- Public/user chat.
- Admin chat.
- Agent execution and persisted steps.
- AI Memory / Brain.
- Confidence and hallucination scoring.
- Reviewer feedback.
- Multi-provider LLM routing.

The backend router currently knows about Gemini, OpenRouter Llama, OpenRouter DeepSeek, Groq, Cerebras, Mistral, Cohere, NVIDIA NIM, and local fallback. Which providers are actually active depends on production configuration and external provider health.

### D. Workflow orchestration
Canonical implementation:

`web-platform/backend/app/routers/workflow.py`

Capabilities verified in code/tests include:
- Workflow definitions and nodes.
- Dependency ordering.
- Registered node actions.
- Retry and timeout behavior.
- Approval nodes.
- Pause/resume after approval.
- Execution queue and priority.
- Durable workflow/run records.
- Scheduled workflow job records.
- Controller-triggered execution.
- Execution history and metrics.
- Restart/pending-run recovery.

The module contains in-process caches for active execution, but database records are the durable persistence layer. Do not create a second workflow engine.

### E. Scheduler/controllers
- Scheduled workflow job persistence.
- Queue scheduling and delay support.
- Controller configuration and enable/disable state.
- Controller execution enqueues the canonical workflow engine.
- Scheduler/background processing also supports daily AI preview work.

### F. Content/CMS
- Posts, drafts, categories, and publication state.
- AI-generated Brain items can remain pending for review.
- Publishing can associate AI-generated content with posts.
- Public site exposes published content.
- Publication-sensitive automation is intended to preserve human review.

### G. Background agent pipeline
The `agents/` directory is an optional/secondary worker pipeline.

Conceptual stages:

`Collector → Writer → Manager → Publisher → Backend review/publish flow`

It is separate from the main FastAPI web service and should not be confused with the canonical workflow engine.

### H. Business and operations
- Logistics estimator.
- Finance.
- Analytics/event tracking.
- AI/API usage and cost tracking.
- Email/newsletter.
- User submissions.
- Moderation-oriented comment/submission features.

### I. File and import layer
- Admin bulk import endpoint: `POST /api/admin/imports`.
- CSV, XLSX, and PDF ingestion.
- 10 MB import-file limit.
- 5,000-row limit for tabular imports.
- Imported records can create pending Brain knowledge and draft posts.
- Image upload endpoint requires admin authorization and validates image MIME types.
- Cloudinary, Supabase Storage, and B2/S3-compatible routing is implemented with policy-based size/class selection.
- RAG batch file ingestion reports per-file success/failure and recovery metadata.

## 5. Data model and taxonomy

Current content schema is intentionally narrower than the generic taxonomy proposed during planning.

### Post
- Types: `news`, `education`, `analysis`.
- Categories: `Supply Chain`, `Logistics`, `Procurement`, `Operations Excellence`, `News`.
- Status: `draft` or `published`.
- `is_published` and `published_at` also track publication state.

### Brain
- Status values in the schema: `pending`, `approved`, `rejected`, `published`.
- Quality fields include confidence and hallucination scores.
- Feedback score/reviewer data exists in the AI layer.

### Knowledge sources
The knowledge router defines source-oriented categories including Supply Chain, Logistics, Ports, Trade, Business, Technology, Regulation, Environment, and Other, plus source types such as manual, file, URL, and RSS.

Knowledge lifecycle states include:
`new → processing → needs_review → approved/rejected → archived`

Publication lifecycle is separately represented as:
`draft → in_review → scheduled → published/unpublished`

These taxonomies should not be conflated with the narrower Post model status/category fields.

## 6. Technology stack

### Frontend
- Next.js 15.5.27
- React 19
- TypeScript
- `@xyflow/react`
- Vercel

### Backend
- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- SlowAPI
- JWT/admin security layer

### Database
- PostgreSQL
- Supabase
- Row Level Security
- pgvector 0.8.2

### AI
- Gemini
- Multi-provider LLM router
- Embeddings
- RAG
- AI Memory / Brain
- Agent runs
- Usage/cost logging

### Automation
- Workflow engine
- Scheduled workflow jobs
- Controllers
- Background scheduler
- Optional `agents/` worker pipeline

### Storage/integrations
- Cloudinary / Supabase Storage / Backblaze B2
- Google Drive exports/backups
- Upstash Redis
- QStash
- Celery + Redis
- RSS feeds
- Email provider integration

### DevOps
- GitHub
- CI/CD
- Dependabot
- Vercel
- Render
- Supabase

## 7. Security posture

The repository contains a Supabase RLS/grant baseline in Alembic migration `20261003_0005`. Migration `20261003_0006` reconciles all current backend model tables/columns/indexes and applies the RLS/grant baseline to those tables. Production migration application and live Supabase privileges have not been verified.
- Apply backend schema changes with `python -m alembic upgrade head` from `web-platform/backend` before starting the API. Startup verifies the recorded Alembic head and fails if the database is behind; it does not create or repair schema.
- Migration `20261003_0006` is forward-only to avoid removing application data. For an unversioned legacy database, first verify that its schema includes the effects of `20260902_0004`, then explicitly stamp that revision and run `python -m alembic upgrade head`; never stamp `20261003_0005` unless the RLS/grant migration has actually run. The frontend `src/lib/migrations.sql` is unreferenced legacy material and is not an active schema source.
- The backend API remains the intended route for public reads; the frontend does not query application tables directly.
- Backend-only provider secrets.
- Admin authorization dependencies on protected routes.
- SlowAPI rate limiting.
- Upload MIME validation.
- B2/S3 configuration validation.
- Import file/row limits.
- Secret sanitization in LLM provider errors.
- Next.js remote image configuration hardening.
- Dependency maintenance and CI verification.
- pgvector moved from `public` to `extensions` schema.

Security work should continue to follow least privilege. Do not add broad grants or permissive RLS policies simply to remove informational advisor messages.

## 8. Production deployment

Frontend:

`https://logixa-flow.vercel.app`

Backend:

`https://logixa-flow.onrender.com`

The frontend is deployed through Vercel with `web-platform/frontend` as the root directory.

The backend is a Docker-based Render service using `web-platform/backend`, with `/health` as the health-check path.

The production backend is deployed on Render. Production database migration is at Alembic revision `20261005_0010`.

## 9. Current release state

Main-branch hardening is in progress toward final operational closure.

Verified:
- Render backend startup is live.
- Production database is at Alembic revision `20261005_0010`.
- Vercel build overrides in `web-platform/frontend/vercel.json` have been removed.
- Vercel operational lock is documented in `SECURITY.md`.
- QStash dispatch and Celery worker code are present.
- Storage routing and Google Drive export code are present.

Final release gates:
- Latest main CI must be green.
- Real Cloudinary, Supabase Storage, B2, and Google Drive provider E2E must pass.
- Actual Render Celery Worker provisioning and QStash → Celery → workflow E2E must pass.
- Operational recovery, monitoring, and failure-mode checks must pass.

Do not mark a gate complete without live evidence.

## 10. What is implemented vs. what must still be live-tested

### Implemented / code-backed
- Public/admin web application.
- FastAPI API.
- Auth/admin authorization.
- Source and RSS ingestion.
- RAG ingestion/search.
- AI chat.
- Agent runs and Brain.
- Multi-provider router.
- Workflow engine.
- Approval workflow.
- Scheduler/controller infrastructure.
- CMS/publishing.
- Import and upload paths.
- Analytics/usage/cost tracking.
- B2/S3-compatible uploads.
- CI/deployment infrastructure.

### Live/E2E checks that should be repeated when making major changes
- Authenticated login/logout against production.
- Real file upload/download against configured B2.
- End-to-end RAG ingest → embed → search with production data.
- End-to-end agent run → Brain review → publish.
- End-to-end workflow → approval → resume → completion.
- Scheduled workflow execution over an actual time boundary.
- Newsletter delivery through the configured email provider.
- External provider failover under a controlled test.

These are validation tasks, not reasons to treat the current deployment as non-production-ready.

## 11. Engineering rules

1. One canonical workflow engine.
2. PostgreSQL is the durable workflow source of truth.
3. No provider secret in frontend code.
4. No automatic publication of sensitive AI content without the intended review gate.
5. RAG changes must consider ingestion, embeddings, retrieval, quality, and telemetry together.
6. Automation should reuse Workflow/Controller infrastructure.
7. External provider failures should degrade gracefully.
8. Logs must not leak secrets.
9. Tests and persistence/recovery must change together with orchestration behavior.
10. Documentation must describe actual code, not aspirational features.

## 12. Future direction

- More complex AI workflows.
- More external integrations.
- Stronger automation and durable job execution.
- Expanded knowledge/RAG capabilities.
- More advanced analytics and business intelligence.
- More operational controls and observability.
- Broader supply-chain intelligence coverage.

## 13. Final mental model

**Logixa Flow = Supply-chain intelligence + RAG knowledge + AI agents/chat + human-reviewed content + durable workflows + scheduling/controllers + operational tools.**

The strength of the platform is the connection between these layers rather than any individual feature.
