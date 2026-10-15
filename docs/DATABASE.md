# Logixa Flow — Database

> Owner: Backend / Data
> Update when: schema, migration policy, RLS, grants, or durable-state rules change
> Last Updated: 2026-10-15
> Do NOT put here: credentials.

## Current production database status (2026-10-14)

Repository and live production Alembic head are `20261011_0013`. Production RAG configuration is `RAG_EMBEDDING_VERSION=2` with `rag_v2_ingestion_mode=voyage_only`; Production Auth Smoke [#38227390320, attempt 4](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38227390320) verified 7 valid Voyage 512-D chunks from 7 public RSS sources and citation-bearing retrieval. `ai_memory_brain=127` (all 127 remain pending/private), `intelligence_sources=12`, `document_embeddings=12`, `stored_files=0`, `workflows=0`, `workflow_nodes=0`, `workflow_runs=0`, and `scheduled_workflow_jobs=0` in the latest read-only query at `2026-10-14T12:23Z`. Production Auth Smoke #38559373751 ingested 12 eligible public RSS sources into Voyage v2 chunks; `brain_items=0`, so private pending Brain drafts were not ingested. Current-schema restore run #38559386330 reached migration `20261011_0013` in the isolated target but failed the old hard-coded `20261008_0012` assertion; guard corrected in commit `11e5d894f990f39df4eb91018fffa8863cef58c3`, rerun pending.

## Database role

Supabase PostgreSQL is the application database and durable source of truth for workflow/run state and related records. pgvector supports RAG retrieval.

## Migration policy

Use Alembic from `apps/web-platform/backend` with `python -m alembic upgrade head`. Repository and live production head are **20261011_0013**, verified 2026-10-11. Migration `20261011_0013` adds the versioned Voyage 512-D embedding path while preserving legacy 768-D vectors. Migration `20261008_0012` remains part of the prior RAG observability history.

Forward corrective migrations are preferred where application data must be preserved. Do not use downgrade as routine data repair. Follow the existing inventory/stamp procedure for an unversioned legacy database; never stamp an RLS/grant migration unless its effects have actually been applied.

## Security model

Backend owns application DB access. Frontend must not receive service-role credentials. RLS is defense-in-depth, not a replacement for API authorization. Avoid broad grants merely to silence advisory output. pgvector is maintained in the extensions schema.

## Legacy schema artifact

apps/web-platform/frontend/src/lib/migrations.sql is unreferenced legacy material and is not an active schema source.

## Durable workflow state

Workflow definitions, runs, execution state, and recovery metadata persist in PostgreSQL. In-memory queues and caches are not durable authority.


## Versioned RAG vectors — 2026-10-11

Migration `20261011_0013` adds nullable 512-D Voyage embedding storage without altering or dropping the existing 768-D column. The legacy column is retained for rollback. Repository and live production heads are `20261011_0013`, and the migration was applied before the successful production RAG E2E.

The resumable re-embedding command remains available for deliberate recovery/backfill work; it is not required to repeat the already-verified public RSS ingest E2E. The production RAG gate was closed by run #38227390320 attempt 4, which verified 7 valid Voyage 512-D chunks and citation-bearing retrieval. Do not switch to `RAG_EMBEDDING_VERSION=1` without a deliberate re-embedding plan because v1 search skips v2-only rows. Never drop the v2 columns as a routine rollback.

## Live database and advisor reconciliation — 2026-10-15

A fresh read-only query against production project `ephrnmigiwjhdjksreos` returned `public.alembic_version=20261011_0013`, 34 public tables, 8 `rag_observability_events`, and zero `workflows`, `workflow_nodes`, `workflow_runs`, and `scheduled_workflow_jobs`. This agrees with the current application Alembic head and confirms that live durable workflow tests cannot proceed until a safe workflow definition/run is configured.

Current Supabase advisors report 34 RLS-enabled tables without policies (INFO), leaked-password protection disabled (WARN), and 82 unused indexes (INFO). Existing documentation records the backend-only access model and a prior grant scan found no client-role table grants; review table-by-table access intent before adding policies or grants. Do not drop indexes based only on unused-index advice. The restore target project API is ACTIVE_HEALTHY; its Supabase CLI migration list is empty, which may reflect Alembic-managed schema history rather than proving a failed restore. Use the evidence-linked application-schema restore gate and keep managed Auth/Storage and object-storage recovery as separate gates. Full inventory: [docs/INFRASTRUCTURE_AUDIT_2026-10-15.md](INFRASTRUCTURE_AUDIT_2026-10-15.md).
