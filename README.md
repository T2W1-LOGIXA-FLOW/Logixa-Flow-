# Logixa Flow

[![CI](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/workflows/ci.yml) [![CodeQL](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/workflows/codeql.yml)

> Owner: Project / Engineering
> Update when: project identity, quick-start, documentation map, or high-level snapshot changes
> Last Updated: 2026-10-15
> Do NOT put here: detailed deployment, security, API, database, or provider runbooks.

## What is Logixa Flow?

Logixa Flow is an AI-powered supply-chain intelligence and workflow automation platform. It combines a public knowledge surface, private admin control plane, AI/RAG, human-reviewed content workflows, durable workflow automation, scheduling, storage integrations, and operational tooling.

Core loop:

Source / File / User Input → Ingestion → RAG / AI → Review / Decision → Workflow → Action → Analytics

## Architecture at a glance

Next.js / React frontend → FastAPI backend → Supabase PostgreSQL + pgvector, with external AI, storage, QStash, Google Drive, and other integrations.

The canonical workflow implementation is `apps/web-platform/backend/app/routers/workflow.py`. PostgreSQL is the durable workflow/run source of truth. The current Render Free path uses QStash delivery and in-process canonical execution with `CELERY_ENABLED=false`.

## Technology stack

Frontend: Next.js, React 19.3.0, TypeScript, @xyflow/react.

Backend: Python, FastAPI, Uvicorn, SQLAlchemy, SlowAPI, JWT/admin authorization.

Data: PostgreSQL through Supabase, pgvector, Alembic.

AI: Gemini plus a multi-provider router, embeddings, RAG, AI Memory/Brain, agent runs, and usage/cost telemetry.

Infrastructure: GitHub, Render, optional/locked Vercel frontend deployment, QStash, Cloudinary, Supabase Storage, Backblaze B2/S3-compatible storage, Google Drive.

Frontend dependency declaration: Next.js `^15.5.27`; committed `package-lock.json` resolves Next.js to **15.5.27** (verified 2026-10-08).

## Current snapshot

Latest connected-provider audit: [docs/INFRASTRUCTURE_AUDIT_2026-10-15.md](docs/INFRASTRUCTURE_AUDIT_2026-10-15.md). Provider resource states and remaining release gates were reconciled on 2026-10-15; release remains pending and no infrastructure was mutated during the audit.

Repository Alembic head: **20261011_0013**.

Live production Supabase migration head: **20261011_0013** (verified 2026-10-11).

Public AI default: disabled. Admin AI default: enabled in repository configuration. Provider implementation/configuration/live health are tracked separately.

Release status is **PENDING FINAL EVIDENCE**. Verified evidence includes Cloudinary, Supabase Storage upload/read/cleanup, private Backblaze B2/S3 plus deployed application upload → private download/readback → cleanup (run #38049146602), Google Drive upload/read, production auth/API smoke, authenticated Admin Brain API/UI smoke (run #38418481082), and production RAG ingestion → Voyage embedding → retrieval/citation (run #38227390320 attempt 4). The historical isolated public-schema restore tested migration `20261008_0012`; current production migration is `20261011_0013`, so current-schema restore readiness remains pending. Durable QStash workflow delivery/completion/idempotency, workflow recovery, Agent→Brain→Publish, SLO/alerting, rollback/DR, newsletter/provider failover, and scheduler observation remain pending. The QStash recovery patch was merged in [PR #115](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/pull/115) as `ede412e03dad4ab1cd15ee436c722c0f1581ea4e`; CI and CodeQL passed, and the Render deployment is live. Live QStash workflow recovery remains pending. Remaining gates and blockers are tracked in `CURRENT_STATE.md`, `ROADMAP.md`, `docs/RELEASE_CERTIFICATION.md`, and `docs/RELEASE_EVIDENCE.md`. Do not infer full certification from provider tests or repository CI alone.

## Documentation map

- docs/INFRASTRUCTURE_AUDIT_2026-10-15.md — live provider inventory, security observations, and ordered remaining work.

- PROJECT_OVERVIEW.md — product and architecture overview.
- CURRENT_STATE.md — current status, gates, blockers, deferred work, and next action.
- ROADMAP.md — phases, acceptance criteria, release gates, future work, and backlog.
- UI_DESIGN_SYSTEM.md — frontend design rules evidenced in code.
- TOOL.md — working protocol, documentation protocol, git/CI rules, tools matrix, and evidence rules.
- SECURITY.md — security model, boundaries, secrets, authorization, and incident handling.
- docs/ARCHITECTURE.md — architecture decisions and durable execution boundaries.
- docs/DEVELOPMENT.md — development setup and CI policy.
- docs/TESTING.md — test layers and evidence rules.
- docs/DEPLOYMENT.md — deployment topology and release gates.
- docs/OPERATIONS.md — operations, recovery, monitoring, and provider verification.
- docs/DATABASE.md — schema, migration, RLS, and durable-state rules.
- docs/API.md — API contracts and route boundaries.
- docs/AI_RAG.md — AI providers, gates, RAG behavior, and publication safety.
- docs/STORAGE.md — storage routing and provider verification.
- docs/TOOLS_AND_LLM_INVENTORY.md — platform tools, external services, LLM adapters, and active-provider status.
- docs/TROUBLESHOOTING.md — diagnostics and recovery guidance.

## Quick start

## Repository layout

- `apps/web-platform/frontend/` — Next.js/React web application.
- `apps/web-platform/backend/` — FastAPI API, services, migrations and tests.
- `apps/web-platform/backend/agents/` — secondary backend agent pipeline; it is separate from the canonical workflow engine.
- No `apps/mobile/` surface exists yet. Add it only when mobile development is started.

See [docs/REPOSITORY_STRUCTURE.md](docs/REPOSITORY_STRUCTURE.md) for placement rules.

Backend:

    cd apps/web-platform/backend
    python -m pip install -r requirements.txt
    python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

Frontend:

    cd apps/web-platform/frontend
    npm install
    npm run dev -- -p 3000

Checks:

    npm run build
    python -m pytest -q
    git diff --check
    git status --short

For operational work, read TOOL.md first and then the relevant domain document.
