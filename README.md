# Logixa Flow

[![CI](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/workflows/ci.yml) [![CodeQL](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/workflows/codeql.yml)

> Owner: Project / Engineering
> Update when: project identity, quick-start, documentation map, or high-level snapshot changes
> Last Updated: 2026-11-10
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

Frontend dependency declaration: Next.js `^15.5.27`; committed `package-lock.json` resolves Next.js to **15.5.28** (verified 2026-11-10).

## Current snapshot

Latest connected-provider audit: [docs/INFRASTRUCTURE_AUDIT_2026-11-10.md](docs/INFRASTRUCTURE_AUDIT_2026-11-10.md). Current main HEAD is 4029acddbc3b67f78fa91d6a188e6218f74db3ed; PR #206, #207, and #208 are merged.

Render backend remains on the Free plan and is live for backend commit de084fd8764ba78bcbe2b6897ed44703aefc13b4; /health returned HTTP 200. Vercel production deployment is READY for current main HEAD; / and /admin/login returned HTTP 200.

Production Supabase Alembic head is **20261016_0015**. All 36 public tables have RLS enabled; direct SELECT grants to anon and authenticated are zero. Production currently has zero workflow definitions, workflow nodes, workflow runs, scheduled workflow jobs, and stored-file records.

Latest local verification: backend **294 passed / 5 skipped**, frontend **87 passed across 36 files**, Next.js production build passed, and full frontend npm audit reported **0 vulnerabilities**. Upstash Redis and QStash remain on Free plans; Redis auto-upgrade is disabled and QStash schedules are empty in both regions.

Release state remains **DEPLOYED — NOT FULLY PRODUCTION-CERTIFIED**. Live QStash workflow completion/idempotency/recovery, Agent→Brain→approval→publish, full SLO/alert evidence, rollback/managed Auth-Storage/object-storage recovery, 24-hour scheduler observation, GitHub branch protection, Cloudflare MFA review, and newsletter/provider failover remain pending. Supabase leaked-password protection is Pro+ only; keep the Free plan and use the available minimum-length and character-requirement controls.

## Documentation map

- docs/INFRASTRUCTURE_AUDIT_2026-11-10.md — latest live provider inventory, free-tier posture, security observations, and remaining gates.

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

Backend (FastAPI Engine — Port 8000):

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
