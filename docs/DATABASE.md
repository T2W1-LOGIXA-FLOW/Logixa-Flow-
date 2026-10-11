# Logixa Flow — Database

> Owner: Backend / Data
> Update when: schema, migration policy, RLS, grants, or durable-state rules change
> Last Updated: 2026-10-08
> Do NOT put here: credentials.

## Database role

Supabase PostgreSQL is the application database and durable source of truth for workflow/run state and related records. pgvector supports RAG retrieval.

## Migration policy

Use Alembic from web-platform/backend with python -m alembic upgrade head. Repository head is **20261008_0012**. Live production head is **20261008_0012**, independently verified from Supabase migration history and alembic_version on 2026-10-09. Migration 20261008_0012 adds durable RAG observability events and revises 20261007_0011.

Forward corrective migrations are preferred where application data must be preserved. Do not use downgrade as routine data repair. Follow the existing inventory/stamp procedure for an unversioned legacy database; never stamp an RLS/grant migration unless its effects have actually been applied.

## Security model

Backend owns application DB access. Frontend must not receive service-role credentials. RLS is defense-in-depth, not a replacement for API authorization. Avoid broad grants merely to silence advisory output. pgvector is maintained in the extensions schema.

## Legacy schema artifact

web-platform/frontend/src/lib/migrations.sql is unreferenced legacy material and is not an active schema source.

## Durable workflow state

Workflow definitions, runs, execution state, and recovery metadata persist in PostgreSQL. In-memory queues and caches are not durable authority.


## Versioned RAG vectors — 2026-10-11

Migration `20261011_0013` adds nullable 512-D Voyage embedding storage without altering or dropping the existing 768-D column. The legacy column is the rollback path. Repository head is now `20261011_0013`; production application of this migration has not yet been independently verified.

Backfill is an explicit application command, not an automatic migration side effect: from `web-platform/backend`, run `python -m app.rag.reembed_v2 --dry-run` and then `python -m app.rag.reembed_v2 --batch-size 50` with `VOYAGE_API_KEY` configured in the secure runtime. The script resumes by processing rows missing v2 vectors and does not rewrite legacy vectors. Keep `RAG_EMBEDDING_VERSION=1` until the migration is applied, the pending count reaches zero, and v2 ingest/search smoke tests pass. Rollback means setting the flag back to `1`; do not drop the v2 columns as a routine rollback.
