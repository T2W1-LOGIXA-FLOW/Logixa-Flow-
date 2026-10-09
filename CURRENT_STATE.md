# Logixa Flow — Current State

> Owner: Project / Engineering
> Update when: release state, verification evidence, blockers, or next actions change
> Last Updated: 2026-10-08
> Do NOT put here: detailed architecture, implementation reference, or step-by-step runbooks; use `PROJECT_OVERVIEW.md` and `docs/*`.

## 1. Current Release

Final live-infrastructure verification and release-gate closure.

## 2. Current Phase

Phase 13 — Release certification and maintenance.

## 3. Overall Status

**PENDING** — production migration 0012 is applied and repository-side release controls are staged; final certification still depends on live provider, recovery, monitoring, and release evidence.

Repository Alembic head is **20261008_0012**. Live production migration history is now **VERIFIED through `20261008_0012_rag_observability`**, applied on 2026-10-08; production durability is now eligible for live telemetry verification.

## 4. COMPLETED

- Canonical workflow implementation remains `web-platform/backend/app/routers/workflow.py`.
- PostgreSQL-backed workflow/run persistence and recovery code exist.
- Render Free deployment is represented as a single Web Service in `render.yaml`.
- QStash dispatch integration exists for the current Free execution path.
- `CELERY_ENABLED=false` is the configured Render Free mode; Celery/Redis remain optional when explicitly enabled.
- Storage routing code exists for Cloudinary, Supabase Storage, and S3-compatible/B2 paths; Google Drive export/backup code exists.
- Public AI and admin AI are independently gated; public AI defaults off in the configured production model.
- RAG ingestion/search/reliability/quality features are implemented. Durable RAG observability event storage is implemented in repository code and deployed in production.
- Alembic migration `20261008_0012` is now the repository head and adds durable RAG observability events.
- Documentation audit and Phase 0 ledgers are complete.
- Latest CI #452 and CodeQL #199 are green on `e46864fad964e24dc60063fb07f46d2f9524e87f` after the transitive `fflate` security patch; repository-side CI/security validation is current.

## 5. VERIFIED

- **Cloudinary live E2E passed on 2026-10-08**: a real 1x1 PNG was uploaded to the connected Cloudinary account, retrieved by asset ID, verified for identity/size, and deleted successfully. Test asset: `logixa/release-gate-cloudinary-20261008`.
- **QStash signed delivery + canonical workflow completion passed on 2026-10-08**: QStash message `msg_7YoJxFpwkEy5zBp2YxbmSsWDsqwAbXM5wtckxoReAkhqA6PJibwLF` reached the Render dispatch endpoint and the durable Supabase workflow run `release-gate-qstash-a1` completed with node `probe`; the scheduled job became `completed`.
- **QStash duplicate-delivery protection passed on 2026-10-08**: a second direct QStash delivery for the same completed run did not add another execution-log entry; the durable run remained `completed` with exactly one `probe` execution entry. This is backed by the terminal-run guard added in commit `3c3e1ca8b7d8e8c07cc6eb53cfe5640d3cd4163a`.
- Repository migration head is `20261008_0012_rag_observability`; it follows `20261007_0011_agent_step_execution_metadata`.
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

1. Real storage-provider E2E verification.
2. Workflow retry/recovery and live stale-claim/failure-recovery verification.
3. Production authentication/API smoke verification.
5. Production monitoring/failure-mode verification.
6. Production RAG and AI publishing E2E verification.
7. Scheduled workflow, newsletter, and controlled provider-failover verification.

## 7. PENDING

- Real Supabase Storage E2E.
- Real Backblaze B2 E2E.
- Real Google Drive E2E.
- Workflow retry/recovery verification.
- Stale-claim recovery verification.
- Controlled failure/recovery verification.
- Production authentication/API smoke tests.
- Production monitoring/failure-mode checks.
- End-to-end RAG ingest → embed → search.
- Agent → Brain → publish E2E.
- Workflow approval → resume → completion.
- Scheduled workflow over a real time boundary.
- Newsletter delivery E2E.
- Controlled external-provider failover test.

## 8. BLOCKED

No repository-level blocker is established. Manual production auth and backup/restore gates are now prepared; their production test-admin secrets and isolated restore target are the remaining operational inputs.

## 9. DEFERRED

- Universal source → publish E2E until storage/provider, provenance, SEO, fact/source QA, and human-approval evidence exists.
- Longer-term session retention/purge/search controls; transcript export is now implemented.
- Remaining Phase 11 RAG operations: durable alert lifecycle, notification adapter, retention/export, experiment statistics, and index telemetry.
- Broader future AI workflows, integrations, analytics, observability, and supply-chain intelligence expansion.

## 10. REMAINING RELEASE GATES

1. Real Supabase Storage, B2, and Google Drive provider E2E passes.
2. Retry, stale-claim recovery, and failure recovery are verified.
3. Duplicate-delivery protection is verified.
4. QStash signing, delivery, and canonical workflow completion are verified.
5. Production authentication/API smoke tests pass.
6. Monitoring and failure-mode checks pass.
7. Production RAG ingest → embed → search is verified.
8. Agent → Brain → publish is verified.
9. Workflow approval → resume → completion is verified.
10. Scheduled workflow crosses a real time boundary successfully.
11. Newsletter delivery is verified.
12. Controlled external-provider failover is verified.

Latest confirmed green repository validation is CI #450 / CodeQL #197 on `115482a27a9c7d56294c8fe09940190555a8d7a1`. Docs-only commits after that SHA intentionally do not trigger CI/CodeQL because the workflows ignore Markdown-only changes.

## 11. LAST VERIFIED

2026-10-08 repository and live Supabase inspection:
- Repository Alembic head: `20261008_0012`.
- Live Supabase migration history latest entry: `20261008_0012_rag_observability`, applied and verified on 2026-10-08.
- Frontend package.json and lockfile both align Next.js to `15.5.27`.
- Current repository tree contains no `UnifiedBackground2.tsx`; only archived historical documentation references it.
- CI #452: **success** on `e46864fad964e24dc60063fb07f46d2f9524e87f`; CodeQL #199: **success** on the same commit. Earlier CI/CodeQL runs remain historical evidence only.
- Cloudinary live E2E passed with real upload/read/delete evidence.
- QStash signed delivery and canonical workflow completion passed with durable PostgreSQL evidence.
- Duplicate QStash delivery was acknowledged without re-executing the completed workflow.
- A stale-claim production test was seeded but did not reach execution during the observation window; it remains pending rather than being inferred as verified.
- Remaining provider/recovery gates are still pending and were not inferred from repository presence alone.

## 12. VERIFY

**None remaining from the Phase 0 VERIFY list.** The original verification items were resolved on 2026-10-08. Remaining release work is tracked as PENDING live release gates, not as unresolved documentation VERIFY items.

## 13. NEXT ACTION

Continue Phase 13 live gates: production auth, provider E2E, workflow recovery, production RAG/AI, backup/restore, scheduled workflow, newsletter/failover, rollback/DR, monitoring/SLO, evidence reconciliation, then final freeze. Production migration 0012 is applied. Next: execute remaining manual live gates, recovery drills, SLO/error-budget review, then freeze only with complete evidence. Keep repository-head, live-head, implemented, configured, enabled, and live-tested states separate.


## 14. 2026-10-09 AUDIT SNAPSHOT

- Full repository tree and infrastructure cross-check completed; no root-level documentation sprawl or obvious secret material was found.
- Render latest application deploy was observed LIVE at `115482a27a9c7d56294c8fe09940190555a8d7a1`; no current Render application errors were observed in the queried log window. Re-check deploy SHA after the current workflow/documentation commits.
- **B2 configuration health check passed on 2026-10-09:** a fresh live `https://logixa-flow.onrender.com/health` returned `status=ok`, `database=ok`, `upload_storage_backend=b2`, `upload_storage_configured=true`, and `missing_env=[]` after the owner added `S3_PUBLIC_BASE_URL`. This verifies configuration health only; the real B2 upload/read/delete E2E gate remains pending.
- Dependency hardening on 2026-10-09 updated nested `three-stdlib` `fflate` from `0.6.10` to patched `0.6.11`; production-only `npm audit` reports zero findings, backend `pip-audit` reports no known vulnerabilities, and CI #452 plus CodeQL #199 passed. Local tests: backend 176 passed / 4 skipped, agents 4 passed, frontend 83 passed; production frontend build completed. A non-blocking React Hook dependency warning remains in `src/app/admin/rag/page.tsx:35`.
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
- These checks validate repository CI/security after the B2 live-test fix. They do not replace the pending real B2 provider round-trip or the pending backup/restore drill.


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
- **Verified failure evidence:** Live Release Gates run #10 at https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37908171471/job/113746607733 shows S3 upload and authenticated readback succeeded, but public GET returned HTTP 400 `Unable to obtain accountId for request`. **B2 remains PENDING** until a fresh live run passes public readback and cleanup.
- **Cost policy detail:** `openrouter/free` is the only configured remote model route. The listed free endpoints include specialized embedding/reranking/decision/safety/audio models; these are not all general chat models, so the free router is the safe general-generation choice. OpenRouter Free plan currently lists a 50 requests/day limit: https://openrouter.ai/pricing/.
- **Key audit limitation:** Render masks secret values. We have not exposed or copied key values. OpenRouter key presence is reported in admin diagnostics, but validity remains **PENDING** until a real deployed AI request succeeds. Do not claim other legacy provider keys are validated or actively used.


## Additional AI Billing Surface Audit — 2026-10-09

- Found and removed another external billing path: RAG embeddings previously called Gemini Embeddings whenever `GEMINI_API_KEY` was present. It now calls only `liquid/lfm-2.5-embedding-350m:free` through OpenRouter, requesting the existing 768 dimensions; if the provider rejects that dimension or the key/request fails, it uses local deterministic hash embeddings. It never falls back to Gemini. Existing pgvector schema stays at 768 dimensions.
- Found a separate Hugging Face toxicity moderation request that could use a configured `HUGGINGFACE_API_KEY`. External HF moderation is now disabled by default and requires explicit `HF_MODERATION_ENABLED=true`; Render is set to false.
- Provider diagnostics now identify legacy Gemini/Groq/Cerebras/Mistral/Cohere/NVIDIA credentials as inactive by cost policy rather than implying they are active routes. Hugging Face moderation is opt-in only.
- Local targeted tests on the latest code: 26 passed across LLM routing, key policy, embedding fallback, and B2 URL normalization. CI #502 passed (https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37914672598) and CodeQL #249 passed (https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37914672600) on commit 40aa0b29514c868a15add1c758d864c6e5087d66.
- Privacy caveat: OpenRouter's Liquid free embedding model page says requests/embeddings may be retained and used to train Liquid models. Do not send confidential documents to this remote embedding endpoint unless that retention policy is acceptable; the local hash fallback avoids external transmission but has lower semantic quality. Source: https://openrouter.ai/liquid/lfm-2.5-embedding-350m:free/providers.


## 2026-10-09 — Private B2 Bucket Compatibility Follow-up

- Implementation is prepared on branch fix/b2-private-bucket-support: S3_PUBLIC_BASE_URL is no longer required for B2 configuration or the B2 live gate.
- B2 uploads return a stable opaque application URL; the backend streams the object through authenticated S3 GET while the Backblaze bucket remains Private. This avoids permanent links to private objects and avoids expiring presigned URLs being stored in content.
- The B2 live gate now checks authenticated upload/read/delete only. A focused local test run passed 17 tests with 4 live-provider tests skipped. The full backend suite was also attempted; 160 passed, 4 skipped, while unrelated workflow/database tests failed because the temporary test environment had no migrated Alembic/SQLite schema and existing workflow expectations differed.
- Status remains PENDING: the change has not yet been merged/deployed, and a fresh live B2 gate plus deployed application-download check are still required. Do not mark B2 VERIFIED based on local tests alone.
