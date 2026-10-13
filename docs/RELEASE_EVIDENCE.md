## Latest closure evidence (2026-10-13)

- [x] PR #95 fixed the Playwright Email textbox selector and was merged to `main` as `93144ba83e0c5690089316404c71be4bcda9877d`: [PR #95](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/pull/95).
- [x] Main CI backend/frontend/agents/security jobs passed: [run #38344770156](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38344770156).
- [x] Python and JavaScript/TypeScript CodeQL passed: [run #38344770188](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38344770188).
- [x] [Production Admin UI Smoke run #38379930389](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38379930389) passed on `main` commit `108f3beb267f0b2443a94fdaac9f45903f12a514`: admin login, authenticated dashboard render, AI Brain navigation, and Brain page render. The workflow retains manual dispatch and now also triggers on changes to its smoke harness; secret values are not recorded.
- [ ] Keep SLO certification pending until alert-path evidence, request/error telemetry, and the required observation window are available; `/health` probes alone are synthetic availability/latency evidence only.

# Logixa Flow — Release Evidence Index

> Owner: Engineering / Release
> Status: ACTIVE — RAG E2E VERIFIED; OVERALL RELEASE PENDING
> Last Updated: 2026-10-12

This is the canonical evidence checklist for the Phase 7–13 release candidate. Evidence must identify the exact SHA, environment, timestamp, and observed durable outcome where applicable.

## Latest production RAG E2E — VERIFIED (2026-10-12 10:10 UTC)

- [x] Workflow [#38227390320, attempt 4](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38227390320) passed the authenticated production provider-smoke → feed-sync → ingestion → retrieval/citation flow against Render commit `3476848877c080d2f76441bd844c8efec3f37751`.
- [x] Voyage smoke: `voyage-3-lite`, 512 dimensions, `persisted=false`.
- [x] Feed sync: 1 feed processed, 0 new imports. Ingestion: 7 sources, 7 chunks, 0 Brain items, 0 errors, 1 attempt.
- [x] Post-run status: embedding version 2, 7 Voyage chunks, 0 legacy-vector chunks. Read-only DB query confirms 7 source records and 7 valid Voyage 512-D vectors; all 125 Brain records remain pending.
- [x] Retrieval returned 5 matches and a non-empty first citation title/URL. The prior HTTP 422 was traced to a 5-second application search budget conflicting with 21-second Voyage request pacing; PR #90 exposed safe error class/status fields in JSON logs, and PR #91 raised the configurable timeout budget to 75 seconds and classified timeouts as 503. Both changes are merged/deployed.
- [ ] Release certification remains pending for independent gates listed below (workflow recovery, Agent→Brain→Publish, SLO/alerting, rollback/DR, newsletter delivery, provider failover, and 24-hour scheduler observation). Authenticated Admin UI core smoke is VERIFIED by run #38379930389.

## Repository
- [ ] Vercel integration check is green on the current main head. **Paused by owner direction on 2026-10-09**: do not attempt build-quota, deployment-refresh, or Vercel-integration remediation until the owner explicitly resumes it. This is an open release exception/gate, not authorization to make Vercel changes.
- [ ] Release SHA fixed; the release candidate is not frozen while production gates remain open.
- [x] Historical diagnostics SHA `896c3d0b1086799883b4128bb5ed3d088c5965d3` passed CI #535 and CodeQL #282 (CI: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38028420417; CodeQL: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38028420358). Render deploy `dep-db4t0iavcj2c73e3snu0` was confirmed live for that SHA; B2 proxy E2E later passed in run #38049146602.
- [x] Latest documented publishing-safety code SHA `8f8397f16d74281d1072ed3b8cb8bd5017a2c5c1` passed CI #569 (backend 200 passed / 5 skipped; agents 5 passed; frontend tests/build and dependency security passed) and CodeQL #316; Render deploy `dep-db5ifnprn11c73dg9ak0` reached live. Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38117114461 and https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38117114411. These checks do not close live production journey gates.
- [x] Repository/infrastructure audit completed 2026-10-09; findings are recorded in `docs/REPO_INFRA_AUDIT.md`.
- [x] Repository CI green for the Supabase cleanup-assertion code change at `b0af10c9208a10c4de794a0ee41d6a82b896d22e` (CI #514; backend 187 passed / 4 skipped; agents, frontend, and security jobs passed).
- [x] CodeQL/security checks green for the same code change (CodeQL #261; Python and JavaScript/TypeScript analyses passed).
- [ ] Dependency/license/security refresh reviewed.
- [x] Current repository migration head is `20261011_0013`; production migration `20261011_0013` was independently confirmed applied on 2026-10-11. The 2026-10-09 isolated backup/restore evidence below tested the then-current `20261008_0012` revision and is historical evidence for that restore run, not a restore of migration 0013.

## Production database
- [x] Supabase migration `20261008_0012_rag_observability` applied on 2026-10-08.
- [x] Production migration `20261011_0013` applied and independently verified on 2026-10-11; Voyage v2 JSON/model/512-D vector columns and HNSW index exist. The earlier empty-table snapshot is superseded by the verified production RAG E2E at the top of this file: 7 stored Voyage 512-D chunks, 7 sources, 0 ingestion errors, and citation-bearing retrieval.
- [x] Production RLS/privilege check: RLS enabled; service_role SELECT allowed; anon/authenticated SELECT denied.
- [x] Supabase security/performance advisors reviewed 2026-10-08. Existing RLS-without-policy INFO findings are consistent with service-role-only internal tables; 96 unused-index INFO findings require workload-based review. One WARN remains: Auth leaked-password protection is disabled and requires dashboard-level action.

## Provider gates
- [x] Cloudinary upload/read/delete live evidence.
- [x] Supabase Storage upload/read live evidence — Live Release Gates run #15 passed the complete provider suite (4 passed), including `test_live_supabase_storage_upload_round_trip`: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37956262981. The test verified upload and byte-identical readback. On 2026-10-10, the test was strengthened to require a 2xx cleanup DELETE response when upload/read succeeded, while avoiding masking an original test failure with a cleanup failure. The stricter assertion passed targeted production run #17 (`1 passed in 3.24s`): https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38021152054.
- [x] Backblaze B2 authenticated private-bucket upload/read/delete evidence — Live Release Gates run #12 passed on 2026-10-09 (`test_live_b2_s3_round_trip`, SHA `88c6491f0d4bf0c279f73971c8be235113272733`): https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37947429179
- [x] Deployed application private-B2 download-proxy E2E evidence — production verification run #38049146602 passed both direct B2 and authenticated application proxy round trips (`2 passed in 12.32s`), including upload, private download/readback, and cleanup after the workflow synced known-good credentials into Render: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38049146602. The earlier run #19 upload timeout is historical and superseded by this successful gate.
- [x] All-provider live suite passed in Live Release Gates run #15 on 2026-10-09 (4 passed: Cloudinary, Supabase Storage, B2/S3, Google Drive): https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37956262981. The later run #16 was cancelled before test execution and adds no new evidence.
- [x] Supabase strict cleanup assertion: targeted production gate passed in run #17 (`1 passed in 3.24s`): https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38021152054.
- [x] Google Drive live upload/read round-trip evidence — Live Release Gates run #14 passed on 2026-10-09 (`test_live_google_drive_upload_round_trip`, 1 passed in 2.04s), superseding run #13's earlier `invalid_scope` failure: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37953000376. Separate export/delete semantics should only be claimed if directly covered by this test.

## Workflow and AI/RAG
- [x] QStash US-region signature verification reaches payload validation: controlled 2026-10-12 smoke returned HTTP 400 Missing workflow run id for an intentionally empty run ID, proving the request passed signature verification without changing workflow state.
- [ ] Durable QStash delivery/completion and duplicate-delivery idempotency remain pending. The historical EU-region message ID cited as successful (msg_7YoJxFpwkEy6sUx5XfK4MbhEa426wR6kc6xiL3z7wX65Jxrp65pan) appears in the QStash delivery log with HTTP 401 Invalid QStash signature; prior completion claims are superseded until a real signed run is independently verified.
- [ ] Live retry/recovery evidence.
- [ ] Live stale-claim reclamation evidence.
- [ ] Controlled live failure/recovery evidence.
- [x] Production Auth Smoke run #11 passed on 2026-10-09: password-grant authentication, `/api/auth/me` admin-role assertion, and admin RAG metrics request succeeded. Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37899971474.
- [x] RAG ingest → embed → search production evidence: VERIFIED by run #38227390320 attempt 4; 7 sources/chunks, 0 ingestion errors, 5 matches, and a non-empty citation.
- [ ] Agent → Brain → publish production evidence.
- [ ] Approval → resume → completion production evidence.
- [ ] Scheduled workflow crosses a real time boundary.
- [ ] Newsletter delivery evidence.
- [ ] Controlled provider failover evidence.

## Recovery
- [x] Production logical backup/restore passed on 2026-10-09. Run #6 restored application `public` schema into isolated project and passed Alembic head `20261008_0012`, critical tables 4/4, and numeric RAG observability row-count assertion (0 rows): https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37964429760. This gate intentionally excludes Supabase-managed Auth/Storage schemas.
- [x] Isolated application-schema restore and integrity assertions passed after run #5's duplicate `users_pkey` failure; fix scopes schema and data dumps to `--schema public`. Historical failure: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37962624876.
- [ ] Object-storage recovery checked, including an isolated restore/readback and integrity check.
- [ ] Application rollback rehearsal completed.
- [ ] Post-rollback auth/workflow/RAG/publish smoke passed.
- [ ] Data-integrity reconciliation completed.

## Operations
- [ ] SLO observation window recorded.
- [ ] Error-budget calculation recorded.
- [ ] Alerting/notification path verified.
- [ ] Operational ownership and escalation path recorded.

## Freeze rule
Certification is NOT CERTIFIED while any required production gate remains unchecked unless an explicit exception is approved and recorded with risk, owner, expiry, and compensating control.


## Production observations (2026-10-10)
- Production verification run #38049146602 confirms the deployed application proxy path is passing. Render event history for 2026-10-09 16:45Z through 2026-10-10 16:50Z shows successful builds/deploys in the returned window and no matching `server_failed`, `build_ended`-failure, or `image_pull_failed` event. This is a bounded event-history observation, not a full availability/SLO certification.
- Render metrics returned no HTTP request-count or latency datapoints for the queried window; only a few CPU/memory datapoints were available. Therefore a defensible SLO/error-budget calculation and alert-path verification are still pending; do not infer healthy request latency from missing metrics.
- Recheck on 2026-10-12 12:35 UTC: Render returned empty `http_request_count`, `http_latency` (p95), and CPU series for 06:00–12:30 UTC; memory had only two isolated points. A request-log query for 09:00–12:30 UTC returned zero request records. This still cannot support an availability/error-budget calculation; retain SLO and alert-path gates as PENDING.
- Startup logs recorded `openrouter-free` HTTP 429 and a failed scheduled daily preview. This remains a separate AI provider rate-limit/quota issue; the production router intentionally avoids paid-provider fallback. The Voyage RAG ingestion/retrieval/citation gate is verified; broader AI publishing and provider-failover gates remain pending.


## Consolidated open gates (2026-10-11)
- [ ] Workflow retry/recovery, stale-claim reclamation, controlled failure recovery, and recovery observability in live production.
- [x] RAG ingest→embed→search/citation: VERIFIED by run #38227390320 attempt 4. [ ] Agent→Brain→publish; approval→resume→completion; scheduled workflow across a real time boundary.
- [ ] Newsletter delivery (currently HTTP 501 until a transactional email provider is connected) and controlled provider failover.
- [x] Full authenticated Admin UI core browser test: [run #38379930389](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38379930389) passed admin login, dashboard render, AI Brain navigation, and Brain page render.
- [ ] Managed Supabase Auth/Storage and object-storage disaster recovery; application rollback rehearsal. Existing isolated public-schema restore does not cover these systems.
- [ ] Production SLO/error-budget calculation and alert-path evidence. Render HTTP request/latency datapoints were unavailable in the inspected window; no SLO pass is implied.
- [ ] Dependency/license/security refresh review and owner-controlled remediation of the Supabase Auth leaked-password-protection warning.
- [ ] Resolve OpenRouter free-tier HTTP 429 without paid fallback unless explicitly approved.
- [ ] Vercel integration check remains paused by owner direction; no remediation without explicit approval.

The current release remains PENDING until every gate above has direct evidence or an explicitly approved release exception. Do not check an item merely because implementation or deterministic tests exist.

## Workflow/Agent hardening patch evidence (2026-10-11)

- [x] Deterministic workflow recovery regression tests: resume skips durable completed nodes; missing claimed_at is reclaimable.
- [x] Agent draft regression tests: build_steps() sanitized objective and HTML escaping of untrusted local-draft values.
- [x] CI #564 passed (backend 199 passed, 5 skipped; agents, frontend tests/build, dependency security passed): https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38116906548
- [x] CodeQL #311 passed for Python and JavaScript/TypeScript: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38116906581
- [x] Render deployment dep-db5ie03hu5js73drbig0 reached live for commit 4f530837fc148e44be2f6cb0ecb0a5f291278be2.

- [ ] Live workflow retry/recovery, stale-claim reclamation and controlled failure recovery.
- [x] Live RAG ingest→embed→search/citation: VERIFIED by run #38227390320 attempt 4. [ ] Agent→Brain→Publish with durable final state/provenance.
- [ ] Live approval→resume→completion and scheduled execution across a real time boundary.

CI and deployment do not substitute for the unchecked live gates.

## Imported draft publishing safety (2026-10-11)

- [x] Backend Markdown-to-HTML conversion escapes untrusted imported draft text.
- [x] CLI publisher Markdown-to-HTML conversion escapes untrusted draft text.
- [x] CI #569 passed: backend 200 passed / 5 skipped; agents 5 passed; frontend tests/build and dependency security passed: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38117114461
- [x] CodeQL #316 passed for Python and JavaScript/TypeScript: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38117114411
- [x] Render deployment dep-db5ifnprn11c73dg9ak0 reached live for code commit 8f8397f16d74281d1072ed3b8cb8bd5017a2c5c1 

Production RAG ingestion/search/citation is now VERIFIED by run #38227390320 attempt 4. Keep workflow recovery, Agent→Brain→Publish, approval/resume, and scheduled-boundary gates unchecked until direct live evidence exists.

## Historical production RAG blocker snapshot (2026-10-11; superseded by latest E2E above)

- [x] At this historical snapshot, production RAG ingest→embed→search/citation was pending and the embedding table was empty. Superseded by run #38227390320 attempt 4, which verified 7-source ingestion and citation-bearing retrieval.
- [x] Historical provider verification blocker was closed by run #38227390320 attempt 4 (Voyage smoke plus full ingestion/retrieval/citation). Do not enable paid-provider fallback without explicit owner approval.
- [x] The current public RSS ingestion, stored Voyage model/dimension checks, query retrieval, and citation assertions passed in run #38227390320 attempt 4. Pending/private Brain drafts remain excluded.
- Release remains PENDING until the live business journey and other open production gates have direct evidence.


## Historical production RAG verification snapshot (2026-10-12; superseded by latest E2E above)

- [x] Live `GET /health` returned HTTP 200. Response reported database `ok`, `pgvector_enabled=true`, and `rag_chunks=0`. This is application/database health evidence only, not a Voyage smoke test.
- [x] Read-only Supabase query reconfirmed Alembic revision `20261011_0013`, `ai_memory_brain=124`, pending Brain records=124, `document_embeddings=0`, `intelligence_sources=0`, `stored_files=0`, and `voyage-3-lite` v2 rows=0.
- [x] Unauthenticated requests to `/api/admin/rag/status`, `/api/admin/rag/context`, and `/api/admin/rag/ingest/sources` returned HTTP 401 (Missing bearer token); this confirms the expected auth gate, not successful admin functionality.
- [x] This snapshot preceded the authenticated E2E. Run #38227390320 attempt 4 later verified the deployed Voyage request, authenticated ingestion, stored 512-D vectors, and retrieval/citation. The expected 401 from unauthenticated requests remains correct.
- [x] Targeted local RAG tests passed (21 passed). After the workflow test fixtures were isolated from the default database, the full backend suite passed: 153 passed with two non-failing dependency/deprecation warnings. This supersedes the earlier local-suite failure count.

Release remains PENDING for the independent non-RAG gates. Health checks, schema presence, and unit tests are not substitutes for production business-journey evidence.


## Workflow test isolation and CI verification (2026-10-12)

- [x] Workflow execution and orchestration tests create an isolated in-memory SQLite schema and monkeypatch the workflow session factory. This removes clean-environment failures caused by tests relying on a pre-existing `workflow_runs` table.
- [x] Targeted workflow execution/orchestration tests passed: `10 passed`.
- [x] Full backend test suite passed in the isolated Python 3.13 environment: `153 passed`, with two non-failing dependency/deprecation warnings.
- [x] PR #73 merged at `cc91b9c0f78e603584a6bbe7737ebf189b758344`.
- [x] CI #592 passed backend, agents, frontend tests/build, and security jobs: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38201060689
- [x] CodeQL #339 passed Python and JavaScript/TypeScript analyses: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38201060691
- [ ] Live workflow retry/recovery, stale-claim reclamation, controlled failure recovery, and all production RAG/publish journeys remain pending. Local tests and CI are not live production evidence.


## Dev-inclusive dependency audit review (2026-10-12)

- [x] Full frontend `npm audit` was reviewed: 8 findings in the baseline lockfile (7 high, 1 moderate); CI's production-only npm audit remains green.
- [x] Findings are in the development/tooling dependency tree, including the Tailwind 3 `braces`/Chokidar/micromatch chain and `postcss-selector-parser`.
- [ ] Compatible remediation and full frontend regression validation remain open. npm proposes Tailwind 4 for the Tailwind 3 dependency chain, which is a major upgrade; no forced major upgrade was made.


## Latest production advisor and frontend verification (2026-10-12)

- [x] Read-only production query at approximately 2026-10-12 04:00 UTC: Alembic `20261011_0013`, `ai_memory_brain=124` (pending=124), `document_embeddings=0`, `intelligence_sources=0`, and `stored_files=0`.
- [x] Supabase security advisors reviewed: 34 informational `RLS enabled, no policy` findings and one warning for disabled leaked-password protection. A read-only grant query found no table privileges for `anon`, `authenticated`, or `PUBLIC`; no broad policies/grants were added.
- [x] Supabase performance advisors reviewed: 88 unused-index notices. No index was dropped because this evidence alone does not establish that the indexes are unnecessary.
- [x] Frontend clean install and tests passed: 35 test files, 83 tests. Next.js production build passed after bounding build workers to 2; the RAG index page's missing hook dependency warning was fixed.
- [x] Production-only frontend audit: 0 findings.
- [ ] Full dev-inclusive frontend audit still reports 8 findings (7 high, 1 moderate), mainly in Tailwind 3 / Next ESLint tooling. A compatible remediation is pending; no forced Tailwind 4 major upgrade was made.
- [ ] Leaked-password protection requires dashboard-level action and independent verification. Production RAG, authenticated workflow recovery, SLO/alerting, managed Auth/Storage recovery, and rollback gates remain pending.


## QStash signature and delivery evidence reconciliation (2026-10-12)

- [x] Published one controlled US-region QStash signature smoke to POST /api/admin/workflow/qstash-dispatch with an empty run_id. The request passed signature verification and reached payload validation, returning HTTP 400 Missing workflow run id. No workflow state was created or changed. QStash message ID: msg_7YoJxFpwkEy56tg1LKtCTTEurgvCMhexCbCk7V94goNH2CUfJJbWu.
- [x] Render startup completed after the delivery and logged Workflow recovery restored 0 pending run(s). This only proves startup/recovery code ran with no pending rows; it does not prove run recovery.
- [ ] The historical EU-region message ID previously cited as a successful completion (msg_7YoJxFpwkEy6sUx5XfK4MbhEa426wR6kc6xiL3z7wX65Jxrp65pan) returns HTTP 401 Invalid QStash signature in the available QStash delivery log. Treat the earlier completion/idempotency assertion as unverified until reproduced using the configured region and a real persisted workflow run.
- [ ] Live workflow creation → QStash dispatch → durable terminal state → duplicate redelivery remains a release gate. The production workflow_runs table currently has zero rows, and no authorized admin bearer token was available to create a valid run through the application API.


## Latest production count delta (2026-10-12 04:10 UTC)

- [x] Read-only query reconfirmed Alembic revision 20261011_0013, ai_memory_brain=125 (pending=125), document_embeddings=0, intelligence_sources=0, stored_files=0, and workflow_runs=0.
- [x] The US-region QStash signature-only smoke returned HTTP 400 Missing workflow run id after signature validation. No workflow run was created; the delivery does not satisfy live workflow completion/idempotency gates.
- [ ] RAG ingestion and persisted workflow run creation remain pending; do not infer success from health, signature verification, or empty-table counts.




## Production Voyage smoke readiness update (2026-10-12)

- [x] Readiness-wait change deployed in Render deploy `dep-db66a5tckfvc73c9usc0` for commit `1a3085f610cf7376b72e14f4e995c28618f9d430`; live at 2026-10-12 04:43:06 UTC.
- [x] Backend startup completed. The scheduler logged that it skipped the scheduled daily preview because a recent attempt is recorded. A public health check returned HTTP 200 after a transient HTTP 502 during the deployment window.
- [ ] Successful authenticated POST `/api/admin/rag/provider-smoke` evidence is not yet available in this review. Do not infer Voyage provider health from key presence or general service health.
- [x] Historical status: version 1 intentionally skipped feed sync/ingestion. Superseded by the successful version-2 Voyage-only E2E in run #38227390320 attempt 4.

## Scheduler cold-start duplicate-preview investigation (2026-10-12)

- [x] Read-only production rows 123–125 are Daily Preview records, status pending, provider openrouter, no workflow_run_id; creation timestamps were 2026-10-12 03:39:04Z, 03:50:34Z, and 04:11:26Z.
- [x] Code inspection found start_scheduler invokes generate_daily_agent_preview immediately before its first sleep, which allows each Render cold start to create another preview.
- [x] PR #75 adds a durable app_settings cooldown, seeded from recent Daily Preview memory or matching AgentRun records, and persists the attempt before provider work. The guard applies only to the scheduled path; manual admin preview remains independent.
- [x] Local backend suite passed: 159 passed, 2 non-failing warnings.
- [x] PR #75 merged at d7db46c15fabe635df052b26c55fb0ed6e4039e8 and Render deploy dep-db65vj7avr4c73fn6gvg reached live.
- [x] First post-deploy observation: scheduler cooldown key persisted with the prior attempt timestamp 2026-10-12 04:11:26 UTC; brain_rows=125, pending_brain=125, previews_since_deploy=0, latest_preview_at=04:11:26 UTC. No new preview was created during the post-deploy cold start.
- [x] Follow-up PR #76 adds remaining-cooldown sleep calculation so a cold start does not reset a full 24-hour sleep.
- [x] PR #76 local validation: 10 targeted scheduler tests passed; full backend suite 163 passed, 2 non-failing warnings.
- [ ] Follow-up deployment and next 24-hour scheduled-cycle observation remain pending. Do not delete existing pending drafts automatically; they are preserved for admin review.


## RAG v2 fallback-vector safety correction (2026-10-12)

- [x] Read-only production counts remain ai_memory_brain=125 (pending=125), document_embeddings=0, intelligence_sources=0, stored_files=0. No production ingestion was performed.
- [x] Code review found that v2 ingestion could persist a hash:fallback legacy vector if the legacy provider failed, even while Voyage v2 succeeded.
- [x] PR #77 changes this path to mark the legacy vector as unavailable, skip the legacy pgvector write, and store the valid Voyage v2 vector only. Legacy search skips v2-only rows; no unlike vector spaces are compared.
- [x] Local backend suite: 164 passed, 2 non-failing warnings.
- [x] CI/CodeQL, deployed provider smoke, authenticated ingestion, 512-D vector verification, and retrieval/citation E2E have passed. The 24-hour scheduler-cycle observation remains pending; current RAG_EMBEDDING_VERSION is 2.


## Production Voyage smoke automation and approved-source guard (2026-10-12)

- [x] PR #78 adds POST /api/admin/rag/provider-smoke. It requires admin authentication, makes one short Voyage embedding request, checks model and 512-D output, returns only sanitized metadata, and persists no vector.
- [x] The production-auth workflow is triggered by changes to the RAG provider/ingestion code or its workflow file. It uses existing production environment secrets; while RAG_EMBEDDING_VERSION=1 it runs only the provider smoke and intentionally skips ingestion.
- [x] When version 2 is enabled after successful smoke, the workflow syncs configured RSS feeds with implicit ingestion disabled, ingests sources plus only approved/published Brain records, checks stored Voyage chunk counts, and verifies a citation-bearing search result.
- [x] Pending/rejected Brain drafts are excluded from bulk ingestion and direct ingestion of an unapproved Brain item returns HTTP 409.
- [x] Local backend suite: 168 passed, 2 non-failing warnings; workflow YAML and shell syntax validation passed.
- [ ] Merge/deploy and live provider smoke have not yet been verified. Production remains at 125 pending Brain drafts, zero intelligence sources, and zero document embeddings; no ingestion was performed.


## Production-auth smoke deployment race correction (2026-10-12)

- [x] First push-triggered production-auth run #12 started before Render had deployed the new provider-smoke route and failed during the deployment window. The endpoint returned 404 until the Render deploy completed; the service is now live with the route.
- [x] Follow-up PR #79 adds a bounded readiness loop: the workflow waits for the new admin RAG status schema before calling the provider-smoke endpoint, avoiding a race between GitHub Actions and Render deployment.
- [x] Historical smoke-verification blocker was closed by run #38227390320 attempt 4: provider=voyage, model=voyage-3-lite, dimensions=512, persisted=false.


## Voyage v2 rollout reconciliation and retry deployment (2026-10-12 04:54 UTC)

- [x] Production Auth Smoke run #13 passed the non-persisting Voyage smoke: `voyage-3-lite`, 512 dimensions, `persisted=false` (run: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38204802339).
- [x] PR #81 merged as `010983891de8ef6a4d14b2d800cc99c853e7c781`; Render deploy `dep-db66fa8u01pc73f9keg0` reached live. It adds bounded retries for Voyage 429/5xx and transient connection/timeouts, honors a capped `Retry-After`, and keeps permanent 4xx/dimension errors fail-closed. CI #615 and CodeQL #362 passed; backend CI was 220 passed / 5 skipped, frontend tests/build passed, dependency security passed.
- [x] During the earlier v2 rollout, Render logged a provider-smoke `HTTPError`. The ingestion request successfully logged source 5 (1 chunk) and source 4 (1 chunk), then failed with `operation=all_sources`, `error_type=embedding`; the instance was shutting down as the environment deployment completed.
- [x] `RAG_EMBEDDING_VERSION` was rolled back to `1` and the rollback deployment reached live. Partial v2 chunks were preserved for safe re-ingestion; no cleanup/deletion was run.
- [ ] A successful provider smoke using the newly deployed retry code has not been independently confirmed from a workflow run result in this review. The smoke-only workflow was retriggered after the retry deployment, but absence of a Render failure log is not accepted as proof of workflow success.
- [x] The clean retry-enabled Voyage smoke and gated feed-sync/ingest/search/citation E2E passed in run #38227390320 attempt 4. Overall release remains PENDING for independent open gates.

## Historical partial Voyage E2E result (superseded by latest production RAG E2E above)

- [x] Production Auth Smoke run #13 passed: provider=voyage, model=voyage-3-lite, dimensions=512, persisted=false.
- [x] RSS sync imported 5 public sources. Production DB has intelligence_sources=5, document_embeddings=2; both rows are v2-only with valid voyage-3-lite 512-D vectors and empty legacy vectors.
- [x] The 125 pending private Brain drafts remain untouched; bulk ingestion now selects only approved/published Brain records.
- [x] PR #81 adds bounded retries for transient Voyage 429/5xx and connection/timeouts, while permanent 4xx remains fail-closed.
- [x] This intermediate failure was superseded by Production Auth Smoke run #38227390320 attempt 4, which completed ingestion and citation retrieval successfully. The deployed flag is now version 2; overall release certification remains pending for other independent gates.
