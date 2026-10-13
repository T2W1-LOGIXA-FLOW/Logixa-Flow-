## Latest release closure update (2026-10-13)

- PR #95 was merged to `main` as `93144ba83e0c5690089316404c71be4bcda9877d`. It fixes the production Admin UI smoke test's ambiguous Email selector by targeting the textbox role explicitly. [PR #95](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/pull/95).
- Main-branch CI run [#38344770156](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38344770156) passed backend, frontend, agents, and security jobs. CodeQL run [#38344770188](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38344770188) passed Python and JavaScript/TypeScript analyses.
- The production Admin UI smoke has **not** yet been rerun after the selector fix. Run it manually from Actions → Production Admin UI Smoke → Run workflow on `main`. Required production environment secrets: `PRODUCTION_FRONTEND_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `PRODUCTION_ADMIN_EMAIL`, and `PRODUCTION_ADMIN_PASSWORD`. Never put secret values in issues, logs, or chat.
- The scheduled/manual health probe measures only `/health` availability and latency; it is not sufficient by itself to certify request-level SLO/error-budget compliance. Alert-path test and longer observation evidence remain required.
- **Overall release remains PENDING — NOT RELEASE-CERTIFIED.** Workflow retry/stale-claim recovery, Agent→Brain→Publish, authenticated Admin UI, measurable SLO/error budget, rollback/DR rehearsal, newsletter delivery/provider failover, and scheduler observation remain independent gates.

## Latest production RAG status (2026-10-12 10:10 UTC)

- **RAG production gate: VERIFIED.** Production Auth Smoke workflow run [#38227390320, attempt 4](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38227390320) passed end-to-end against Render commit `3476848877c080d2f76441bd844c8efec3f37751`.
- Provider smoke returned `status=ok`, `provider=voyage`, `model=voyage-3-lite`, `dimensions=512`, `persisted=false`.
- Feed sync processed 1 configured feed (0 new imports because the feed was already synchronized). Authenticated ingestion processed 7 public RSS sources, 0 Brain items, 7 chunks, 0 errors, 1 attempt. Post-ingestion status reported `embedding_version=2`, 7 Voyage chunks, and 0 legacy-vector chunks.
- Citation search returned `total=5`; the first result included a non-empty citation title and URL (Supply Chain Orchestration Is Becoming the Control Layer Between Decisions and Execution — Logistics Viewpoints). This closes the production ingest→embedding→retrieval→citation gate.
- The HTTP 422 root cause was verified from safe structured logs: `TimeoutError` because the search budget was 5 seconds while Voyage calls are intentionally paced at 21 seconds. PR #90 fixed the logging allowlist; PR #91 raised the configurable search budget to 75 seconds and maps timeout errors to HTTP 503 instead of misclassifying them as HTTP 422. Both changes are merged and the latest Render deployment is live.
- Read-only production counts: `ai_memory_brain=125`, `pending Brain=125`, `intelligence_sources=7`, `document_embeddings=7`, valid `voyage-3-lite` 512-D vectors=7, legacy vectors=0. Pending/private Brain drafts remain untouched.
- **Overall release remains PENDING — not release-certified.** Workflow retry/stale-claim recovery, RAG→Agent→Brain→Publish, authenticated Admin UI, measurable SLO/alerting, rollback/DR rehearsal, newsletter delivery, provider failover, and the 24-hour scheduler observation remain independent open gates. Vercel remediation remains paused by owner direction; no Vercel changes were made.

# Logixa Flow — Current State

> Owner: Project / Engineering
> Update when: release state, verification evidence, blockers, or next actions change
> Last Updated: 2026-10-12
> Do NOT put here: detailed architecture, implementation reference, or step-by-step runbooks; use `PROJECT_OVERVIEW.md` and `docs/*`.

## 1. Current Release

Final live-infrastructure verification and release-gate closure.

## 2. Current Phase

Phase 13 — Release certification and maintenance.

## 3. Overall Status

**PENDING — NOT RELEASE-CERTIFIED.** Production migration `20261011_0013` is applied. The production RAG ingest→embedding→retrieval→citation gate is VERIFIED by run #38227390320 attempt 4; live workflow recovery, RAG→Agent→Brain→Publish, authenticated Admin UI, measurable SLO/alerting, rollback/DR, newsletter delivery, provider failover, and the 24-hour scheduler observation remain open gates.

Repository and live production Alembic revision are **20261011_0013**. Migration `20261011_0013` adds the versioned Voyage 512-D embedding path without replacing the legacy 768-D path. Current production configuration is `RAG_EMBEDDING_VERSION=2`, `rag_v2_ingestion_mode=voyage_only`. Read-only counts are `document_embeddings=7`, `intelligence_sources=7`, `stored_files=0`, and `ai_memory_brain=125` (pending=125); all 7 embedding rows are valid Voyage 512-D vectors, with zero legacy vectors. The pending Brain records remain untouched. OpenRouter HTTP 429 remains a separate scheduled AI preview/provider-failover risk.

The latest production RAG gate is live-verified, not inferred from CI: run #38227390320 attempt 4 passed provider smoke, 7-source ingestion with zero errors, and retrieval returning 5 matches with a non-empty citation. CI/backend, frontend, agents, security, and CodeQL checks passed for PR #91; Render deploy `dep-db6b2ac9v7es739sk9f0` is live. Older zero-row snapshots below are historical and superseded by the current counts above.

## Latest regression validation (2026-10-12)

- Workflow execution/orchestration tests now use isolated in-memory SQLite fixtures instead of relying on the environment's default database; this resolved eight clean-environment failures caused by a missing `workflow_runs` table.
- Targeted workflow execution/orchestration tests: 10 passed.
- Full backend suite in the isolated Python 3.13 environment: 153 passed, 2 non-failing dependency/deprecation warnings.
- PR #73 was merged as `cc91b9c0f78e603584a6bbe7737ebf189b758344`. CI #592 passed all backend, agents, frontend, and security jobs; CodeQL #339 passed for Python and JavaScript/TypeScript.
- These results close this patch's code-regression gate only. The RAG ingest/search/citation gate was later verified by run #38227390320 attempt 4. Production workflow retry/recovery, stale-claim recovery, Agent→Brain→Publish, and other live release gates remain PENDING.

## Latest live database check (2026-10-12 04:10 UTC)

- Historical production counts at 2026-10-12 04:10 UTC were 125 pending Brain rows and zero sources/embeddings. Superseded by the latest successful RAG E2E at the top. The empty workflow table still means duplicate-delivery/recovery has not been verified; release remains PENDING.

## Scheduler restart-duplication finding (2026-10-12)

- Production rows 123, 124, and 125 are private pending Daily Preview records created within roughly 32 minutes; all show provider openrouter and no workflow_run_id. Render logs show the app restarting around the same windows.
- Root cause: start_scheduler immediately executes the daily preview before sleeping for SCHEDULER_INTERVAL_HOURS, so each Render cold start can generate another preview and hit provider rate limits.
- PR #75 is merged as d7db46c15fabe635df052b26c55fb0ed6e4039e8 and Render deploy dep-db65vj7avr4c73fn6gvg is live. The durable 24-hour cooldown was bootstrapped from the latest existing preview (2026-10-12 04:11:26 UTC). Read-only verification after deployment: brain_rows=125, pending=125, previews_since_deploy=0. Manual admin preview remains separate; existing pending drafts were preserved.
- Local backend suite after the fix: 163 passed, 2 non-failing dependency/deprecation warnings. Render deployment and first post-deploy cold-start guard are verified. PR #76 is merged as 2f9e26afc166f8b9b34b7731b68f62a0d61daa05 and Render deploy dep-db663fqvcj2c73f9mjdg is live. The scheduler now calculates remaining cooldown after cold starts. The next scheduled cycle remains pending observation.

## RAG v2 fallback-vector safety finding (2026-10-12)

- Historical snapshot before the authenticated RAG E2E: 125 pending Brain records and zero embeddings. Current public RSS ingestion is verified at the top; pending Brain drafts remain untouched.
- Code review found that when RAG_EMBEDDING_VERSION=2 and the legacy embedding provider returns hash:fallback, the ingestion path still wrote that synthetic vector into the legacy 768-D column while storing the valid Voyage 512-D vector.
- PR #77 fixes this: v2-only chunks store an empty legacy JSON vector and a v2-only marker, skip legacy pgvector writes, and persist only the valid Voyage vector. Legacy search skips those rows rather than comparing unlike vector spaces. If rolling back to version 1, v2-only rows are intentionally unavailable until a valid legacy embedding is generated.
- Local backend suite: 168 passed, 2 non-failing warnings. PR #78 stages an admin-only, non-persisting Voyage provider smoke and a production workflow that runs it on merge; while embedding version remains 1, the workflow intentionally skips ingestion. When version 2 is explicitly enabled after smoke success, it syncs configured public RSS feeds, ingests source records plus only approved/published Brain records, verifies 512-D Voyage chunks, and checks retrieval citations. CI/deployment and live Voyage smoke remain pending; do not enable RAG v2 until the smoke succeeds.

## Production Voyage smoke workflow status (2026-10-12)

- PR #79's bounded readiness wait is deployed in Render deploy `dep-db66a5tckfvc73c9usc0` for commit `1a3085f610cf7376b72e14f4e995c28618f9d430`; deploy reached live at 2026-10-12 04:43:06 UTC.
- The updated backend startup completed, and logs show the scheduler cooldown guard skipped an immediate preview. A public health request during the rollout briefly returned HTTP 502, then returned HTTP 200 after startup completed.
- The workflow now waits up to five minutes for the authenticated RAG status schema before calling the admin-only, non-persisting Voyage smoke. A successful provider-smoke response is not yet independently confirmed in the available evidence, so provider verification remains PENDING.
- Historical workflow behavior while `RAG_EMBEDDING_VERSION=1`: feed sync and ingestion were skipped. Current production uses version 2 and `voyage_only`; the authenticated RAG E2E passed, while overall release remains pending for other gates.

## 4. COMPLETED

- Canonical workflow implementation remains `web-platform/backend/app/routers/workflow.py`.
- PostgreSQL-backed workflow/run persistence and recovery code exist.
- Render Free deployment is represented as a single Web Service in `render.yaml`.
- QStash dispatch integration exists for the current Free execution path.
- `CELERY_ENABLED=false` is the configured Render Free mode; Celery/Redis remain optional when explicitly enabled.
- Storage routing code exists for Cloudinary, Supabase Storage, and S3-compatible/B2 paths; Google Drive export/backup code exists.
- Public AI and admin AI are independently gated; public AI defaults off in the configured production model.
- RAG ingestion/search/reliability/quality features are implemented. Durable RAG observability event storage is implemented in repository code and deployed in production.
- Alembic migration `20261008_0012` adds durable RAG observability events; repository/live head has since advanced to `20261011_0013` for the additive Voyage 512-D embedding path.
- Documentation audit and Phase 0 ledgers are complete.
- Earlier CI #535 and CodeQL #282 passed on merged diagnostics code SHA `896c3d0b1086799883b4128bb5ed3d088c5965d3` (CI: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38028420417; CodeQL: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38028420358). Render deployment is now VERIFIED: deploy `dep-db4t0iavcj2c73e3snu0` is `live` on 2026-10-10 at 05:43:30Z for SHA `896c3d0b1086799883b4128bb5ed3d088c5965d3` (https://dashboard.render.com/web/srv-d9172fe8bjmc739pd600). CI #535 and CodeQL #282 are green. The follow-up one-time production verification run #38049146602 succeeded after syncing the known-good GitHub B2 settings into Render and waiting for the deployment to become live; authenticated application upload → private download/readback → cleanup and direct B2 round-trip both passed (2 passed in 12.32s). Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38049146602.

## 5. VERIFIED

- **Backblaze B2 private S3 API and deployed application proxy live E2E passed**: provider-level upload/read/delete passed in run #12 on 2026-10-09; the deployed application private-download proxy passed in production verification run #38049146602 on 2026-10-10 (`2 passed in 12.32s`), covering direct B2 round-trip and authenticated application upload → private download/readback → cleanup. Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38049146602.
- **All live storage-provider tests passed in Live Release Gates run #15 on 2026-10-09** (4 passed): Cloudinary, Supabase Storage, private B2/S3, and Google Drive. Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37956262981. Supabase Storage upload/read matched bytes in run #15. The cleanup DELETE assertion was strengthened on 2026-10-10 and passed the targeted production gate in Live Release Gates run #17 (`1 passed in 3.24s`): https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38021152054. Supabase Storage upload/read/cleanup is now VERIFIED. Do not rerun the full provider suite without a code change or new failure.
- **Cloudinary live E2E passed on 2026-10-08**: a real 1x1 PNG was uploaded to the connected Cloudinary account, retrieved by asset ID, verified for identity/size, and deleted successfully. Test asset: `logixa/release-gate-cloudinary-20261008`.
- QStash evidence correction (2026-10-12): the historical message msg_7YoJxFpwkEy6sUx5XfK4MbhEa426wR6kc6xiL3z7wX65Jxrp65pan is present in the EU-region delivery log with HTTP 401 Invalid QStash signature, contradicting the earlier completion claim. A fresh US-region signature-only smoke reached payload validation and returned HTTP 400 Missing workflow run id as expected. US-region signature validation is verified; durable workflow delivery/completion remains PENDING until a real persisted run succeeds via the configured region.
- QStash duplicate-delivery protection remains PENDING. The terminal-run guard exists in code (commit 3c3e1ca8b7d8e8c07cc6eb53cfe5640d3cd4163a), but the historical live message evidence conflicts with delivery logs and must be re-run with a valid signed delivery before certification.
- Historical repository migration `20261008_0012_rag_observability` follows `20261007_0011_agent_step_execution_metadata`; the current repository/live revision is `20261011_0013`.
- Deterministic stale-claim reclamation coverage is now present in commit `34137b30527bbce0975d78ca4b554cb2291af68c`; live production stale-claim recovery remains pending.
- **Live production Supabase migration history contains `20261008_0012_rag_observability` as the latest migration**, verified from the connected Supabase project on 2026-10-08. Evidence: Supabase project `ephrnmigiwjhdjksreos`, migration listing observed 2026-10-08; dashboard: `https://supabase.com/dashboard/project/ephrnmigiwjhdjksreos/database/migrations`.
- Render configuration contains one Free Web Service and `CELERY_ENABLED=false`.
- Frontend declares Next.js `^15.5.27`; **package-lock.json resolves Next.js to `15.5.27`**, verified from the committed lockfile on 2026-10-08.
- Admin AI defaults are represented as enabled while public AI defaults are represented as disabled.
- Vercel override configuration was intentionally removed and its re-enable path is operationally locked.
- Phase 11 foundation is implemented: durable RAG error/quality telemetry storage is now deployed in production via migration 0012; alert delivery, retention/export, experiment analysis, and production verification remain.
- **`UnifiedBackground2.tsx` is not present in the current repository tree; repository search on 2026-10-08 found only the archived historical documentation and the canonical note identifying the historical reference.** It is therefore not treated as an active component.
- Deterministic RAG ingest → embed → search coverage is now present, and repeated brain publish is covered for idempotency. An owner-scoped chat transcript export is implemented with deterministic ordering and ownership tests.
- **CI #452 / CodeQL #199 passed on `e46864fad964e24dc60063fb07f46d2f9524e87f` after the dependency-lock security patch.**
- Production authentication is staged in `.github/workflows/production-auth-smoke.yml` using `PRODUCTION_ADMIN_EMAIL` / `PRODUCTION_ADMIN_PASSWORD`; isolated backup/restore is staged in `.github/workflows/production-backup-restore.yml` using `SUPABASE_DB_URL` / `SUPABASE_RESTORE_DB_URL`. The restore gate now checks the actual `scheduled_workflow_jobs` table.

## 6. IN PROGRESS

The remaining work is now limited to live release evidence and explicitly deferred product/operational capabilities.

Current active closure tracks:

1. Workflow retry/recovery and live stale-claim/failure-recovery verification.
2. Production monitoring, SLO/error-budget, and failure-mode verification.
3. Production RAG and AI publishing E2E verification.
4. Scheduled workflow, newsletter, and controlled provider-failover verification.
5. Object-storage recovery, rollback rehearsal, and post-rollback smoke verification.
6. Full authenticated Admin UI browser verification.

## 7. PENDING

- Workflow retry/recovery verification under live production conditions.
- Stale-claim recovery verification with a durable before/after state and execution evidence.
- Controlled failure/recovery verification, including sanitized logs/metrics.
- Production monitoring, alert delivery, SLO observation window, and error-budget review.
- Production RAG ingest→embed→search/citation: VERIFIED by run #38227390320 attempt 4. The separate OpenRouter free-tier HTTP 429 affecting scheduled AI preview remains open; paid-provider fallback is not authorized.
- Agent → Brain → publish E2E.
- Workflow approval → resume → completion.
- Scheduled workflow over a real time boundary.
- Newsletter delivery E2E; current newsletter endpoints return HTTP 501 until a transactional email provider is connected.
- Controlled external-provider failover test.
- Object-storage recovery, rollback rehearsal, data-integrity reconciliation, and post-rollback smoke.
- Full authenticated Admin UI browser verification; login route and unauthenticated protection are verified, but authenticated dashboard rendering/navigation/responsive behavior are not.

## 8. BLOCKED

No repository-level blocker is established. Production Auth/API smoke and isolated application-schema backup/restore have passed. Remaining gates require targeted provider testing and controlled production/operations exercises; Auth/Storage-managed data and object-storage recovery are not covered by the public-schema restore.

## 9. DEFERRED

- Universal source → publish E2E until storage/provider, provenance, SEO, fact/source QA, and human-approval evidence exists.
- Longer-term session retention/purge/search controls; transcript export is now implemented.
- Remaining Phase 11 RAG operations: durable alert lifecycle, notification adapter, retention/export, experiment statistics, and index telemetry.
- Broader future AI workflows, integrations, analytics, observability, and supply-chain intelligence expansion.

## 10. REMAINING RELEASE GATES

1. Supabase Storage upload/read/cleanup E2E is verified by run #17; the deployed application private-B2 download-proxy E2E is verified by run #38049146602 (`2 passed in 12.32s`). Backup/restore is separately verified for the `public` application schema in run #6. Cloudinary and Google Drive upload/read round-trip also have live evidence.
2. Retry, stale-claim recovery, and controlled failure/recovery live verification remain pending.
3. Duplicate-delivery protection remains pending live evidence.
4. US-region QStash signature validation is verified by the 2026-10-12 signature-only smoke; durable delivery and canonical workflow completion remain pending.
5. Production authentication/API smoke tests pass. **VERIFIED** by Production Auth Smoke run #11 on 2026-10-09: password-grant authentication, `/api/auth/me` admin-role assertion, and admin RAG metrics request passed. Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37899971474.
6. Monitoring, SLO/error-budget observation, alerting, and failure-mode checks remain pending.
7. Production RAG ingest → embed → search remains pending.
8. Agent → Brain → publish remains pending.
9. Workflow approval → resume → completion remains pending.
10. Scheduled workflow crossing a real time boundary remains pending.
11. Newsletter delivery remains pending; endpoints currently return HTTP 501 until a transactional email provider is connected.
12. Controlled external-provider failover remains pending.

Historical application-code validation CI #535 / CodeQL #282 passed on `896c3d0b1086799883b4128bb5ed3d088c5965d3`; the later publishing-safety change passed CI #569 / CodeQL #316 on `8f8397f16d74281d1072ed3b8cb8bd5017a2c5c1` (see the 2026-10-11 update above). Subsequent documentation-only commits do not trigger CI/CodeQL by design; Vercel deployment remediation remains paused at owner direction.

## 11. LAST VERIFIED

- **Production logical backup/restore passed on 2026-10-09**: run #6 succeeded, restoring isolated `public` schema, Alembic head `20261008_0012`, critical tables 4/4, and RAG observability row-count assertion (0 rows). Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37964429760. This is not a managed Auth/Storage or object-storage recovery test.

- **Google Drive live upload/read round-trip passed on 2026-10-09**: Live Release Gates run #14, job test result `1 passed in 2.04s`. Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37953000376. This supersedes the earlier run #13 `invalid_scope` failure; do not continue describing Google Drive as blocked.

2026-10-08 repository and live Supabase inspection:
- Repository Alembic head: `20261008_0012`.
- Live Supabase migration history latest entry: `20261008_0012_rag_observability`, applied and verified on 2026-10-08.
- Frontend package.json and lockfile both align Next.js to `15.5.27`.
- Current repository tree contains no `UnifiedBackground2.tsx`; only archived historical documentation references it.
- CI #452: **success** on `e46864fad964e24dc60063fb07f46d2f9524e87f`; CodeQL #199: **success** on the same commit. Earlier CI/CodeQL runs remain historical evidence only.
- Cloudinary live E2E passed with real upload/read/delete evidence.
- Earlier QStash completion/idempotency claims are under re-verification: the message ID cited in the older note returned HTTP 401 Invalid QStash signature in the EU-region delivery log.
- A new US-region signature-only smoke reached payload validation (HTTP 400 Missing workflow run id); it created no workflow state. Durable completion/idempotency remains pending.
- A stale-claim production test was seeded but did not reach execution during the observation window; it remains pending rather than being inferred as verified.
- Remaining provider/recovery gates are still pending and were not inferred from repository presence alone.

## 12. VERIFY

**None remaining from the Phase 0 VERIFY list.** The original verification items were resolved on 2026-10-08. Remaining release work is tracked as PENDING live release gates, not as unresolved documentation VERIFY items.

## 13. NEXT ACTION

Continue Phase 13 only on genuinely open gates; do not rerun provider checks already covered unless code/config changes or a regression occurs. Supabase upload/read/cleanup is verified by run #17 and deployed application private-B2 proxy E2E by run #38049146602. Render logs on 2026-10-10 recorded OpenRouter HTTP 429 for the scheduled AI preview; this is an AI quota/rate-limit blocker, not a B2 failure. Do not enable paid-provider fallback without owner approval. Prioritize workflow recovery, production RAG/AI, scheduled workflow/newsletter/failover, rollback/DR, monitoring/SLO, full authenticated Admin UI verification, and evidence reconciliation. See docs/TOOLS_AND_LLM_INVENTORY.md for the tools and LLM inventory. Production migration 0012 is applied. Keep repository-head, live-head, implemented, configured, enabled, and live-tested states separate.


## 14. 2026-10-09 AUDIT SNAPSHOT

- Full repository tree and infrastructure cross-check completed; no root-level documentation sprawl or obvious secret material was found.
- Render latest application deploy was observed LIVE at `115482a27a9c7d56294c8fe09940190555a8d7a1`; no current Render application errors were observed in the queried log window. Re-check deploy SHA after the current workflow/documentation commits.
- **B2 configuration and live E2E are verified:** the 2026-10-09 health check returned `status=ok`, `database=ok`, `upload_storage_backend=b2`, `upload_storage_configured=true`, and `missing_env=[]`. On 2026-10-10, production verification run #38049146602 passed direct B2 upload/read/delete and authenticated application upload/private-download/readback/cleanup (`2 passed in 12.32s`). Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38049146602.
- Dependency hardening on 2026-10-09 updated nested `three-stdlib` `fflate` from `0.6.10` to patched `0.6.11`; production-only `npm audit` reports zero findings, backend `pip-audit` reports no known vulnerabilities, and CI #452 plus CodeQL #199 passed. Local tests: backend 187 passed / 4 skipped in CI #514, agents 4 passed, frontend CI passed; production frontend build completed. A non-blocking React Hook dependency warning remains in `src/app/admin/rag/page.tsx:35`.
- Full npm audit still reports dev-toolchain-only findings involving `braces` and `postcss-selector-parser` under the current Tailwind 3 toolchain. The suggested automatic `--force` path is a Tailwind 4 major upgrade and has not been applied; track a dedicated compatibility review before changing it.
- Vercel production currently serves HTTP 200 and has no grouped runtime errors in the last 7 days, but the GitHub Vercel check on the later docs-only main head is failing because of the Hobby build-rate limit. The last READY Vercel deployment is an earlier docs-only commit, so this is an integration-capacity warning rather than a frontend runtime failure.
- Supabase production remains at migration/alembic head `20261008_0012`; no active workflow/scheduled jobs were present at audit time and durable RAG event count was zero.
- Stale migration/telemetry statements were found in `docs/DATABASE.md`, `docs/TROUBLESHOOTING.md`, `docs/TESTING.md`, and `docs/OPERATIONS.md` and reconciled during the audit.
- Detailed evidence is recorded in `docs/REPO_INFRA_AUDIT.md`.

## Live Gate Failure Review — 2026-10-09

- **Production Auth Smoke run #11 passed**: configuration preflight, Supabase password-grant authentication, `/api/auth/me` admin-role assertion, and admin RAG metrics request all completed successfully. Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37899971474
- **Live Release Gates run #8 failed because of a workflow bug, not yet a provider verdict**: `PYTEST_ADDOPTS` was used to select the test while the command also passed a file path. Pytest automatically consumed the environment variable and tried to resolve the bare `test_live_release_gates.py` as an extra argument, then exited with “file or directory not found.” Fixed in commit `320051b1b74ca117ce8e06d3818f15b60431fa84`: use an explicit provider-to-test-path shell case, invoke pytest with one quoted target, and default manual runs to B2.
- **B2 live test strengthened** in commit `cd68f57a0d0c7cee88ab3b3dfc276474e996fa22`: after S3 API upload/read, it now also fetches the object via `S3_PUBLIC_BASE_URL` and verifies the bytes, then deletes the temporary object. The prior failed run did not actually execute a provider test.
- **Backup/restore run #2 failed at preflight** because `SUPABASE_DB_URL` used a pooler URL without an explicit `sslmode`. The workflow now enforces TLS by normalizing absent `sslmode` to `require` in the job environment, rejects explicitly insecure modes, validates production/isolated project identities, and uses the same session for replication-role data restore. Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37899987010
- **Still requires owner action:** rerun Live Release Gates with provider `b2`; rerun Production Backup Restore after the workflow fixes. The backup workflow must still use the shared Session Pooler host on port 5432 and the dedicated isolated restore project. Do not expose secret values in logs or chat.
- **Current validation:** local syntax checks passed for all shell blocks in the auth, backup/restore, and live release workflows; embedded Python and the live-test module compile; the selected live test path exists. This is syntax evidence only, not a replacement for the real provider/restore runs.
- **B2 health configuration:** live Render health returned `status=ok`, `database=ok`, `upload_storage_configured=true`, and `missing_env=[]`. Public object access is not verified until the new B2 E2E passes.

## Post-Fix Repository CI Evidence — 2026-10-09

- CI #462 passed on `cd68f57a0d0c7cee88ab3b3dfc276474e996fa22`: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37901339183
- CodeQL #209 passed on the same commit: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37901339148
- These checks validate repository CI/security after the B2 live-test fix. B2 provider round-trip and public-schema backup/restore are verified by their respective live runs; managed Supabase Auth/Storage recovery and object-storage disaster recovery remain separate gates.


## Live Gate Failure Review — 2026-10-09 (runs #9 / #3)

- **Live Release Gates run #9 reached the real B2 E2E**: S3 API upload and readback succeeded, but the HTTP GET through `S3_PUBLIC_BASE_URL` returned HTTP 400. Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37902011746/job/113726523053. The storage URL helper now normalizes native Backblaze download-host roots and `/file` prefixes to `/file/<bucket>`, while preserving custom domains. The test emits a sanitized response excerpt on further public-URL failures. B2 is not marked VERIFIED until a full public readback and cleanup pass.
- **Production Backup Restore run #3 passed connectivity and backup creation, then failed during role replay**: Supabase rejected `ALTER ROLE ... SET log_min_messages` with `permission denied for parameter log_min_messages`. Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37902042481. Supabase-managed role settings are platform-owned; the workflow no longer replays the role-only dump and restores application schema/data using roles already provisioned in the isolated restore project. The complete restore and critical-state assertions remain PENDING until a new run passes.
- Do not use production as the restore target. The isolated target remains `bxvykaijlrqjvlhtumpg`; its public schema was reset only after production backup and connectivity checks succeeded.


## 2026-10-09 — AI Cost Guard and B2 URL Follow-up

- **Implemented (repository):** backend LLM router permits only `openrouter/free` and local fallback; legacy DB/task provider choices and paid provider keys cannot activate Gemini/Groq/Cerebras/Mistral/Cohere/NVIDIA through this router.
- **Implemented (repository):** OpenRouter provider normalizes paid model IDs to `openrouter/free`. Agent writer's normal provider chain is OpenRouter free only; if unavailable, it uses local fallback rather than paid Gemini/Groq/OpenAI/Hugging Face routes.
- **Implemented (configuration):** Render service env set to OpenRouter free model values and `AI_COST_PER_1K=0`; deployment was requested. Confirm live deployment and actual key validity before marking VERIFIED.
- **Implemented (settings contract):** AI setting API only accepts/reports `openrouter-free`; legacy stored settings are ignored by the runtime router.
- **Implemented (B2):** public URL helper now recognizes native Backblaze download hosts and S3-compatible endpoints; unit tests cover both formats and custom domains.
- **Historical failure evidence (superseded):** Live Release Gates run #10 at https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37908171471/job/113746607733 showed public GET returning HTTP 400 `Unable to obtain accountId for request`. The configuration was corrected afterward; the successful production B2 verification is recorded in run #38049146602.
- **Cost policy detail:** `openrouter/free` is the only configured remote model route. The listed free endpoints include specialized embedding/reranking/decision/safety/audio models; these are not all general chat models, so the free router is the safe general-generation choice. OpenRouter Free plan currently lists a 50 requests/day limit: https://openrouter.ai/pricing/.
- **Key audit limitation:** Render masks secret values. We have not exposed or copied key values. OpenRouter key presence is reported in admin diagnostics, but validity remains **PENDING** until a real deployed AI request succeeds. Do not claim other legacy provider keys are validated or actively used.


## Additional AI Billing Surface Audit — 2026-10-09

- Found and removed another external billing path: RAG embeddings previously called Gemini Embeddings whenever `GEMINI_API_KEY` was present. It now calls only `liquid/lfm-2.5-embedding-350m:free` through OpenRouter, requesting the existing 768 dimensions; if the provider rejects that dimension or the key/request fails, it uses local deterministic hash embeddings. It never falls back to Gemini. Existing pgvector schema stays at 768 dimensions.
- Found a separate Hugging Face toxicity moderation request that could use a configured `HUGGINGFACE_API_KEY`. External HF moderation is now disabled by default and requires explicit `HF_MODERATION_ENABLED=true`; Render is set to false.
- Provider diagnostics now identify legacy Gemini/Groq/Cerebras/Mistral/Cohere/NVIDIA credentials as inactive by cost policy rather than implying they are active routes. Hugging Face moderation is opt-in only.
- Local targeted tests on the latest code: 26 passed across LLM routing, key policy, embedding fallback, and B2 URL normalization. CI #502 passed (https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37914672598) and CodeQL #249 passed (https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37914672600) on commit 40aa0b29514c868a15add1c758d864c6e5087d66.
- Privacy caveat: OpenRouter's Liquid free embedding model page says requests/embeddings may be retained and used to train Liquid models. Do not send confidential documents to this remote embedding endpoint unless that retention policy is acceptable; the local hash fallback avoids external transmission but has lower semantic quality. Source: https://openrouter.ai/liquid/lfm-2.5-embedding-350m:free/providers.


## 2026-10-09 — Private B2 Bucket Compatibility Follow-up

- Merged PR #57 into main. Merge commit: 3f33841133e4d8cbfab88be9a7eb42186fa8e775.
- Render deployment for that commit completed successfully (deploy ID dep-db4foi740ujc73eg764g). CI, CodeQL, and Vercel checks passed on the final PR head.
- S3_PUBLIC_BASE_URL is no longer required for B2 configuration or the B2 live gate. B2 uploads return an opaque application path; the backend streams objects through authenticated S3 GET while the Backblaze bucket remains Private.
- The download proxy forces non-image/non-PDF files to attachment and applies Content-Security-Policy: sandbox; caching is private. Focused local tests passed 17 tests with 4 live-provider tests skipped.
- Status remains PENDING for live provider verification: a fresh authenticated B2 upload/read/delete gate and a real deployed application download check have not yet been recorded. Do not mark B2 VERIFIED based only on CI/local tests.


## Backup/Restore Gate — 2026-10-09 (run #5)

- **Live restore remains FAILED / PENDING.** Run #5 created the production logical backup, reset only the isolated restore project's `public` schema, restored schema objects, then failed on `COPY users` with a duplicate primary key. Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37962624876.
- Read-only live catalog inspection found the `users` table in the managed `auth` schema (owned by `supabase_auth_admin`) in both production and the isolated restore project; no `public.users` table exists. The isolated target's managed Auth schema is not reset by the workflow, so managed Auth rows must not be replayed as part of the application-schema restore.
- **Remediation committed to the workflow:** both schema and data dumps are explicitly scoped to `--schema public`; a guard rejects schema-qualified Auth/Storage COPY entries in the data dump. This keeps the gate focused on application-schema recovery and avoids modifying managed Auth data.
- **Not yet verified:** the fix requires a fresh manual run of `Production Backup Restore Gate`. Do not mark backup/restore VERIFIED or release-certified until the run restores data and passes Alembic head `20261008_0012`, four critical-table assertions, and the RAG event-count check.


## Admin UI and B2 Production Verification — 2026-10-10

### Admin UI

- Admin command-center implementation was merged in PR #66; dashboard correction commit `214f1fea82279433ff1b56d98e0bbf79db50ae5d` fixes the draft queue summary to show an em dash while loading/errors and `5+` when the five-row preview limit is reached.
- Vercel production deployment `dpl_5wycNFm291dS8nWZJmfEsfTjC2pw` is READY. Production alias: https://logixa-flow.vercel.app.
- Browser smoke check: `/admin/login` renders; unauthenticated `/admin` redirects to the login route. Auth Smoke run #11 also passed password-grant login, `/api/auth/me` admin-role assertion, and an admin RAG metrics request: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37899971474.
- **Partially verified:** production login page and protected-route redirect are verified, and frontend CI/build checks passed. An authenticated browser session was not available, so dashboard rendering/navigation/responsive behavior with a real admin session remains unverified. Vercel preview builds for later backend-only PRs were blocked by the free-plan deployment limit; the existing production deployment remains READY.

### Private B2 upload/download proxy

- **Status: VERIFIED for the live S3 round-trip and authenticated application proxy gate on 2026-10-10.**
- Evidence: [B2 proxy verification run #38049146602](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38049146602). The workflow updated Render's `S3_ENDPOINT_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, and `S3_REGION` using the repository's known-good GitHub Actions secrets; Render deployment `dep-db53vf0473hc739ptscg` reached `live`.
- Post-deploy live tests passed: `test_live_b2_s3_round_trip` and `test_live_b2_application_download_proxy_round_trip` — **2 passed in 12.32s**. This confirms direct S3 upload/read/delete and the authenticated production application upload/private-download/cleanup flow for the tested payload.
- Previous failures were caused by Render-side B2 settings differing from the working CI credentials/configuration; the post-sync live gate now passes. Do not expose credential values in logs or documentation.
- Re-run the live gate after any future B2 credential, bucket, endpoint, signing-region, or storage-routing change.


## Backup/Restore Gate — 2026-10-09 (run #5)

- **Live restore remains FAILED / PENDING.** Run #5 created the production logical backup, reset only the isolated restore project's `public` schema, restored schema objects, then failed on `COPY users` with a duplicate primary key. Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37962624876.
- Read-only live catalog inspection found the `users` table in the managed `auth` schema (owned by `supabase_auth_admin`) in both production and the isolated restore project; no `public.users` table exists. The isolated target's managed Auth schema is not reset by the workflow, so managed Auth rows must not be replayed as part of the application-schema restore.
- Remediation committed to the workflow: both schema and data dumps are explicitly scoped to `--schema public`; a guard rejects schema-qualified Auth/Storage COPY entries in the data dump. This keeps the gate focused on application-schema recovery and avoids modifying managed Auth data.
- **Not yet verified:** the fix requires a fresh manual run of `Production Backup Restore Gate`. Do not mark backup/restore VERIFIED or release-certified until the run restores data and passes Alembic head `20261008_0012`, four critical-table assertions, and the RAG event-count check.


## Admin UI Production Verification — 2026-10-10

- Admin command-center code was merged through PR #66 at commit `a68cfd0031fdef4ba7665a6d3df5367d9df7dafe`: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/pull/66. The dashboard correction commit `214f1fea82279433ff1b56d98e0bbf79db50ae5d` makes the draft queue summary show an em dash while loading/errors and `5+` when the five-row preview limit is reached.
- Vercel production deployment `dpl_5wycNFm291dS8nWZJmfEsfTjC2pw` is READY. Production alias: https://logixa-flow.vercel.app.
- Production login page renders and unauthenticated `/admin` redirects to login. Auth Smoke run #11 passed password-grant login, `/api/auth/me` admin-role assertion, and admin RAG metrics request: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37899971474.
- **Partially verified:** login/protected-route behavior and production deployment are verified, but an authenticated browser session was not available to verify the full dashboard rendering, navigation, and responsive behavior with a real admin session. Do not claim full browser UI verification.


## 2026-10-11 Documentation and release-gate reconciliation

The production B2 application proxy remains VERIFIED by run #38049146602; do not rerun without a relevant code/config change or regression. The isolated public-schema database restore is VERIFIED, but this is not managed Supabase Auth/Storage or object-storage disaster recovery. Release status remains **PENDING**.

Remaining engineering work: live retry/stale-claim/failure recovery; RAG ingest→embed→search and Agent→Brain→publish journeys; approval→resume and scheduled time-boundary tests; newsletter delivery and controlled provider failover; full authenticated Admin UI browser verification; managed Auth/Storage and object-storage recovery; application rollback rehearsal; measurable production SLO/error-budget and alert-path evidence; dependency/license/security review. OpenRouter free-tier HTTP 429 remains an observed AI quota blocker; paid fallback is not authorized. Vercel remediation remains paused by owner direction.

Evidence limitation: Render event inspection showed no matching failure events in the bounded returned event set, but HTTP request-count/latency datapoints were unavailable. Do not interpret this as an SLO pass. Each live gate needs an evidence link or a clearly documented owner-controlled blocker.

## 2026-10-11 — Workflow recovery and Agent/RAG code hardening

Code fixes committed to main:
- web-platform/backend/app/routers/workflow.py: resume now seeds executor progress from persisted completed_nodes; a running job with a missing claimed_at is reclaimable instead of becoming stranded.
- web-platform/backend/app/routers/agent.py: build_steps() now defines its sanitized objective; local draft HTML escapes the objective, title, source titles, and source notes before interpolation.
- Regression tests added for restart-resume without replaying completed nodes, missing-lease reclamation, build_steps(), and HTML escaping.

Validation: CI #564 passed on commit 4f530837fc148e44be2f6cb0ecb0a5f291278be2: backend 199 passed, 5 skipped; agents tests passed, frontend tests/build passed, and dependency security job passed. CodeQL #311 passed for Python and JavaScript/TypeScript. Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38116906548 and https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38116906581.

Render deploy dep-db5ie03hu5js73drbig0 reached live for code commit 4f530837fc148e44be2f6cb0ecb0a5f291278be2. This confirms deployment, not live recovery or RAG/publishing E2E. Production live workflow recovery, RAG→Agent→Brain→Publish, approval/resume, and scheduled-boundary evidence remain PENDING. Release certification remains PENDING.

## 2026-10-11 — Imported draft publishing safety

- Backend imported-draft conversion and the CLI publisher now HTML-escape untrusted Markdown lines before wrapping them in HTML, preventing embedded tags/attributes from becoming executable markup.
- Regression tests cover backend imported drafts and the CLI publisher. CI #569 passed on 49ce8ccd8d413a69b925a84b0f60cad01d01e459: backend 200 passed / 5 skipped; agents 5 passed; frontend tests/build and dependency security passed. CodeQL #316 passed for Python and JavaScript/TypeScript.
- Render deployment dep-db5ifnprn11c73dg9ak0 reached live for commit 8f8397f16d74281d1072ed3b8cb8bd5017a2c5c1.

Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38117114461 · https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38117114411

These are code, regression-test, CI, security-scan, and deployment results. They do not constitute live workflow recovery or production RAG/Agent/Brain/Publish evidence; those gates remain PENDING.

## 2026-10-11 — RAG fallback visibility and provider evidence boundary

- Commit `4746ffc0b89aee5581e6c74308a9e1db46e7dbe0` logs a safe reason when RAG embedding falls back to deterministic hash vectors (missing key, HTTP failure, invalid response, or dimension mismatch). Regression assertions were added in commit `35793c2d29dbc9b1814e030cd03ebea6610a8720`.
- Owner-supplied smoke notes report Gemini/Groq/Mistral/Cohere/Cloudflare endpoints responding, while OpenRouter returned 429/empty replies and Cerebras/Hugging Face returned 402. These are not independently linked and do not prove application-level failover. Free-only production routing remains unchanged pending explicit cost/terms approval.
- RAG dimension blocker remains: configured/stored shape is 768; Voyage 512 and Cloudflare BGE-M3 1024 are incompatible without a planned migration and re-embedding. Do not change the dimension in place.
- Production RAG ingest→search/citation is VERIFIED by run #38227390320 attempt 4. Provider failover, publishing, approval/resume, workflow recovery, authenticated Admin UI, SLO telemetry, email, managed Auth/Storage recovery, and rollback rehearsal remain PENDING. Release certification remains PENDING.


## 2026-10-11 — Versioned Voyage RAG dimension path

- Added migration `20261011_0013` for nullable 512-D Voyage vectors while preserving legacy 768-D vectors. Application schema change is additive; production application is not yet verified.
- Added strict Voyage `voyage-3-lite` 512-D adapter, model-scoped v2 retrieval, dual-write support when `RAG_EMBEDDING_VERSION=2`, and resumable re-embedding command `python -m app.rag.reembed_v2`.
- Regression tests cover the Voyage request shape and fail-closed behavior. CI and CodeQL must pass before considering the code change validated.
- Do not set `RAG_EMBEDDING_VERSION=2` until production migration 0013 is applied, all existing rows have v2 vectors, remaining count is zero, and live ingest/search tests pass. Rollback is environment flag back to `1`; legacy 768-D data is retained.
- Cloudflare BGE-M3 (1,024-D) is deliberately not an automatic Voyage fallback: mixed embedding spaces are not comparable. It requires its own 1,024-D versioned index/backfill if chosen later.
- Historical status at the time of the 2026-10-11 Voyage migration: production RAG ingest→search was pending. Superseded by the latest verified production RAG E2E at the top of this file. Provider failover, RAG→Agent→Brain→Publish, and overall release certification remain PENDING.


## 2026-10-11 — Latest deploy and runtime provider audit

- CI #586 passed on commit 5a359f79f831ca8f0e925d7e1818f67c89659cf1: backend migration/tests, agents, frontend tests/build, and dependency security succeeded. Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38136913611.
- Render deploy dep-db5nf395efls73aqkdi0 is live. Startup logs show Alembic migration 20261008_0012 → 20261011_0013 ran before Uvicorn startup. SQLAlchemy emitted warnings that it did not recognize pgvector column types during schema inspection; investigate/fix before treating schema/index inspection as clean.
- Historical snapshot (superseded by the latest production RAG status at the top): at that time RAG_EMBEDDING_VERSION=1 and production ingest→search was pending.
- Provider audit: app/llm/providers.py implements multiple provider adapters, but app/llm/router.py currently wires only OpenRouter openrouter/free plus local fallback. Production local fallback defaults off, so other provider keys and endpoint smoke tests do not establish live application failover. OpenRouter HTTP 429 remains an AI availability risk.
- Release certification remains PENDING.


## Production verification update (2026-10-11)

- Render deploy `dep-db5rei779l7c73frthcg` for commit `318114adfd60b4d0a6289f03b7bd6c1f0fe365a7` is live. Logs show `Application startup complete`; startup/schema inspection now uses PostgreSQL `information_schema` for column names instead of SQLAlchemy reflection of pgvector types. No matching pgvector-reflection warning was found in the log window after this deploy became live; retain monitoring until an explicit health request confirms runtime status.
- Direct read-only inspection of the production Supabase project `ephrnmigiwjhdjksreos` confirms Alembic revision `20261011_0013`, the legacy `embedding` vector column, Voyage v2 JSON/model/vector columns, and the `ix_document_embeddings_embedding_v2_hnsw` index.
- Historical production counts from this dated snapshot were `document_embeddings=0`, `intelligence_sources=0`, `ai_memory_brain=122`, `posts=8`. Superseded by the latest production counts and successful RAG E2E at the top; pending/private Brain records are intentionally not bulk-ingested.
- Recent Render startup logs also show OpenRouter HTTP 429 and a failed scheduled daily preview. Do not enable paid provider routing without owner approval. Release certification remains PENDING; `/health` was not independently confirmed by an HTTP response in this verification pass.


## Production verification update (2026-10-12)

- Direct HTTP request to `https://logixa-flow.onrender.com/health` returned HTTP 200. Response reported database `ok`, profile `supabase`, `pgvector_enabled=true`, `rag_chunks=0`, and legacy embedding model `liquid/lfm-2.5-embedding-350m:free`. This confirms service health, not Voyage provider health.
- Historical production query at 2026-10-12 03:36 UTC found `ai_memory_brain=122` and zero source/embedding rows. Superseded by the latest read-only query and successful ingestion recorded at the top.
- Historical auth check: unauthenticated RAG endpoints correctly returned HTTP 401. This was an expected auth gate, not an ingestion attempt; subsequent authenticated workflow run #38227390320 attempt 4 verified provider smoke and ingestion.
- Earlier local full-suite failure counts are superseded by the 2026-10-12 isolated workflow-fixture fix: the full backend suite now passes (153 passed, two non-failing warnings). Production RAG remains pending because provider smoke, authenticated ingestion, vector verification, and retrieval/citation E2E are still unverified.
- Historical snapshot (superseded): `RAG_EMBEDDING_VERSION=1`, empty corpus, and no retrieval evidence. Current v2 corpus and citation E2E are verified at the top of this file; overall release certification remains PENDING for independent gates.

## Historical partial Voyage E2E state (superseded by latest production RAG status above)

- Production Auth Smoke run #13 passed: Voyage model voyage-3-lite, 512 dimensions, no vector persisted by the smoke.
- The first authenticated E2E imported 5 public RSS sources and persisted 2 valid Voyage v2 chunks, then failed on a later source because the legacy embedding provider returned HTTP 400. This intermediate failure is superseded by the successful attempt 4 E2E above.
- Historical counts at that stage were `intelligence_sources=5` and `document_embeddings=2`; the latest state is 7 sources/7 valid Voyage chunks. No pending Brain drafts were indexed.
- At that stage RAG_EMBEDDING_VERSION had been rolled back to 1. It is now version 2 with deployed `voyage_only` mode after the successful E2E.
- The ingestion/retrieval/citation gate has passed; overall release remains PENDING for the independent gates listed above.


## Release closure implementation (2026-10-12)

PR #93 merged as `053891cfa7bd9e970566e9b598f507c6af53792f`. CI #641 passed backend, frontend, agents, and security; CodeQL #389 passed Python and JavaScript/TypeScript. PR #92 merged as `8eb11fa80852dcceb4b7b11a764af910426bacd4`; CI #640 and CodeQL #388 passed. The repository now includes an Agent → Brain → approval → publish → soft-unpublish API integration test, a manual authenticated production Admin UI browser smoke, and a 15-minute synthetic `/health` probe with a configurable webhook alert path. `docs/SLO_ERROR_BUDGET.md` explicitly limits the probe to synthetic availability; a 30-day error-budget pass is not implied. `docs/DR_ROLLBACK.md` specifies a controlled isolated recovery rehearsal and read-only post-rollback smoke. These changes are code/runbook readiness, not production evidence. Release remains PENDING until required production secrets are confirmed, manual UI and alert-path runs pass, and live business-journey, workflow recovery, 24-hour scheduler, object-storage recovery, and rollback/DR evidence is collected.
