# Logixa Flow — Database

> Owner: Backend / Data
> Update when: schema, migration policy, RLS, grants, or durable-state rules change
> Last Updated: 2026-10-08
> Do NOT put here: credentials.

## Database role

Supabase PostgreSQL is the application database and durable source of truth for workflow/run state and related records. pgvector supports RAG retrieval.

## Migration policy

Use Alembic from web-platform/backend with python -m alembic upgrade head. Repository head is 20261007_0011. Live production head is 20261007_0011, verified 2026-10-08. Migration 20261007_0011 revises 20261005_0010.

Forward corrective migrations are preferred where application data must be preserved. Do not use downgrade as routine data repair. Follow the existing inventory/stamp procedure for an unversioned legacy database; never stamp an RLS/grant migration unless its effects have actually been applied.

## Security model

Backend owns application DB access. Frontend must not receive service-role credentials. RLS is defense-in-depth, not a replacement for API authorization. Avoid broad grants merely to silence advisory output. pgvector is maintained in the extensions schema.

## Legacy schema artifact

web-platform/frontend/src/lib/migrations.sql is unreferenced legacy material and is not an active schema source.

## Durable workflow state

Workflow definitions, runs, execution state, and recovery metadata persist in PostgreSQL. In-memory queues and caches are not durable authority.
