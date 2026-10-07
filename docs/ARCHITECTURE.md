# Logixa Flow — Architecture

> Owner: Engineering
> Update when: system boundaries or canonical execution paths change
> Last Updated: 2026-10-08
> Do NOT put here: release status or operator checklists.

## System model

Next.js/React frontend → FastAPI backend → Supabase PostgreSQL/pgvector, with external AI, storage, delivery, and integration providers.

## Canonical workflow

The canonical workflow implementation is web-platform/backend/app/routers/workflow.py. Do not create a second workflow engine. Controllers, scheduling, QStash delivery, and optional Celery execution route into it.

## Durable state

PostgreSQL is the durable source of truth for workflow definitions, runs, execution state, recovery metadata, and application data. In-process queues and caches are not durable authority.

## Current delivery path

workflow enqueue → QStash → signed /api/admin/workflow/qstash-dispatch → canonical workflow execution → PostgreSQL.

Render Free intentionally uses CELERY_ENABLED=false. Celery and Redis remain optional only when explicitly enabled.

## Other boundaries

RAG is under web-platform/backend/app/rag/ and uses ingestion, chunking, embeddings, PostgreSQL/pgvector retrieval, source-aware context, search/ranking, and reliability controls. The agents/ pipeline is a secondary collector → writer → manager → publisher path and is separate from the canonical workflow engine. Backend authorization and provider credentials remain server-side; the frontend must not receive service-role database credentials.

## Decisions

One workflow engine; PostgreSQL durable workflow state; QStash durable delivery for the current Free path; one Render Web Service; RLS is defense-in-depth; Alembic owns schema changes; forward corrective migrations are preferred; frontend/src/lib/migrations.sql is legacy/unreferenced; public AI and admin AI are independent; publication-sensitive AI remains subject to human approval.
