# Logixa Flow — Roadmap

> Owner: Project / Engineering
> Update when: a phase, release gate, deferred item, or backlog item changes status
> Last Updated: 2026-10-14
> Do NOT put here: detailed implementation instructions; use domain docs and runbooks.

## Release closure and repository inventory (2026-10-14)

- **Branch/PR cleanup:** latest read-only inventory on 2026-10-14 shows only `main` and no open PRs. Recovery hardening PR #115 merged as `ede412e03dad4ab1cd15ee436c722c0f1581ea4e`; its topic branch is no longer present in the current remote branch list.
- **Verified:** production RAG ingestion/embedding/retrieval/citation [#38227390320 attempt 4](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38227390320); authenticated Admin Brain API smoke [#38418481082](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38418481082); main CI [#38417257244](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38417257244) and CodeQL [#38417257528](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38417257528); frontend CI [#38424954202](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38424954202) and CodeQL [#38424954119](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38424954119).
- **Still pending:** production has zero workflow definitions/nodes/runs/scheduled jobs, so a safe authenticated test workflow must be configured before live QStash delivery/completion/idempotency and recovery can be verified; Agent → Brain → approval → Publish/resume; production request/error telemetry, alert-path and SLO window; newsletter delivery and provider failover; managed Auth/Storage and object-storage recovery; current-schema backup/restore; rollback/DR; 24-hour scheduler observation.
- **Security/cost:** 7 high dev-toolchain npm audit findings remain (0 moderate/critical); production-only audit has 0 findings. Supabase Auth leaked-password protection is a documented Free-plan limitation. Do not resume Vercel remediation or paid AI fallback without explicit owner approval.

**Overall release: PENDING — NOT RELEASE-CERTIFIED.** Do not equate a green CI run, a synthetic health probe, or the RAG-specific E2E with full release certification.

## Latest code-level recovery hardening (2026-10-14)

- Patch branch: `fix/qstash-dispatch-exception-recovery`. It releases a durable claim after an uncaught execution exception, requeues cancelled runs and responds HTTP 503 for QStash retry; terminal redelivery repairs job status without replaying side effects.
- Local validation passed: backend 237 passed / 5 skipped; agents 5 passed; frontend 83 tests passed and production build passed; backend `pip-audit` found no known vulnerabilities; production-only npm audit found 0 vulnerabilities.
- CI [#38504093229](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38504093229) and CodeQL [#38504093130](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38504093130) passed; Render deploy [dep-db7f2d5bedkc738hnkr0](https://dashboard.render.com/web/srv-d9172fe8bjmc739pd600/deploys/dep-db7f2d5bedkc738hnkr0) is live and GET /health returned HTTP 200 in 2.073 seconds. Production QStash delivery/recovery remains pending until real persisted-run evidence is captured.

## Latest release closure update (2026-10-13)

- [x] Admin Brain response-validation defect fixed on `main` commit `d826ad9105434acd3621c1df9e7469247da0129a`; CI [#38417257244](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38417257244) and CodeQL [#38417257528](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38417257528) passed.
- [x] Render deployment `dep-db74borm8hqs73fasbf0` is successful for the fix commit. Production Admin UI smoke [#38418481082](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38418481082) then verified the authenticated Brain API returns HTTP success and a JSON array, closing this specific production defect.
- [x] The redundant PR #112 was closed because its complete tree was already represented on `main`; its PR-head CI [#38418503996](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38418503996) and CodeQL [#38418504242](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38418504242) passed.
- [x] Latest synthetic SLO probe [#38412066986](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38412066986) passed. Render request-count/latency metrics are still empty, so this is not request-level SLO evidence.
- [ ] Overall release remains PENDING: durable QStash delivery/completion/idempotency and stale-claim recovery, Agent→Brain→Publish/resume, request/error telemetry and 30-day SLO/error-budget evidence, newsletter provider/delivery, managed Auth/Storage and object-storage recovery, rollback/DR rehearsal, the seven remaining high dev-toolchain advisories, and 24-hour scheduler observation remain open.
- [ ] Supabase Auth leaked-password protection is documented as unavailable on the current Free plan in issue #56; do not treat it as an actionable blocker while that plan remains in use.
- [ ] Vercel remediation and paid AI fallback remain paused until explicit owner approval.

## 2026-10-12 Production RAG E2E — VERIFIED

- [x] Voyage provider smoke passed: `voyage-3-lite`, 512 dimensions, `persisted=false`.
- [x] `RAG_EMBEDDING_VERSION=2` and deployed mode `voyage_only` verified by the authenticated production workflow.
- [x] Full ingestion passed: 7 RSS sources, 7 Voyage 512-D chunks, 0 errors, 0 Brain items ingested, 0 legacy-vector chunks.
- [x] Citation retrieval passed: 5 matches returned and the first match had a non-empty citation title/URL. Evidence: [Production Auth Smoke run #38227390320, attempt 4](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38227390320).
- [x] Fixed the production timeout mismatch: Voyage request pacing is 21 seconds, while the previous search budget was 5 seconds. PR #90 made safe diagnostics visible; PR #91 made the search budget configurable (75-second default) and classified timeouts as search/503 rather than unknown/422. Both are merged and deployed.
- [ ] Overall release remains PENDING: workflow recovery, RAG→Agent→Brain→Publish, SLO/alerting, rollback/DR rehearsal, newsletter delivery, provider failover, and 24-hour scheduler observation remain open.

## Completed Phases

### Phase 0 — Documentation audit and migration ledger
Status: VERIFIED. Evidence: 12 Markdown files were audited and ledgers A–E were built. No orphan file, plan, or decision was identified.

### Repository hardening and platform foundations
Status: DONE / VERIFIED at repository level, with overall release certification still pending. Repository/live Alembic revision is `20261011_0013`; the Voyage v2 path is additive and legacy 768-D vectors are retained for rollback. Production RAG ingest→retrieval→citation is VERIFIED by run #38227390320 attempt 4: 7 sources, 7 valid Voyage 512-D chunks, 0 errors, 5 retrieval matches, and a non-empty citation. Latest read-only counts at `2026-10-14T11:58Z` are `document_embeddings=12`, `intelligence_sources=12`, and `ai_memory_brain=127` (all pending/private); `workflow_runs=0` and `scheduled_workflow_jobs=0`. OpenRouter HTTP 429 remains a separate scheduled AI preview risk. Authenticated Admin UI core smoke is VERIFIED by run #38379930389. Live workflow recovery, RAG→Agent→Brain→Publish, monitoring/SLO, newsletter/failover, managed Auth/Storage and object-storage recovery, and rollback remain open.

## Active Phase

**Release status: PENDING — NOT RELEASE-CERTIFIED.** Production migration `20261011_0013` is applied and RAG v2 is active in `voyage_only` mode. The production ingest→retrieval→citation gate passed in run #38227390320 attempt 4 with 7 valid Voyage chunks and 0 ingestion errors. Keep the no-paid-fallback policy; OpenRouter HTTP 429 still affects the separate scheduled AI preview. Authenticated Admin UI core smoke is VERIFIED by run #38379930389. Live workflow recovery, RAG→Agent→Brain→Publish, SLO/alerting, rollback/DR, newsletter, provider failover, and scheduler observation remain open.

### Phase 13 — Release certification and maintenance

Objective: close the remaining production/provider/recovery evidence gates and freeze only when the release evidence index is complete.

Current state (2026-10-11): production migration `20261011_0013` is applied; `20261008_0012_rag_observability` remains part of the migration history. Cloudinary, Supabase Storage upload/read/cleanup, private B2/S3 provider and deployed application proxy, Google Drive upload/read, QStash US-region signature-only smoke, production auth smoke, and public-schema logical backup/restore have live evidence. Remaining gates are workflow recovery, RAG/AI business journeys, newsletter/failover, object-storage/managed Auth-Storage recovery, rollback, and monitoring/SLO. Authenticated Admin UI core smoke is VERIFIED by run #38379930389.

### Final live-infrastructure verification

Objective: close evidence-based release gates without changing the current architecture merely to satisfy documentation.

Current verified baseline:
- Earlier application-code CI #535 / CodeQL #282 passed on diagnostics SHA `896c3d0b1086799883b4128bb5ed3d088c5965d3` (https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38028420417; https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38028420358).
- Latest merged patch validation: CI #592 and CodeQL #339 passed on PR #73 (https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38201060689; https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38201060691); Render deployment `dep-db65h2mk1f9s73evo9mg` reached live.
- The deployed application private-B2 proxy E2E passed in production verification run #38049146602 (`2 passed in 12.32s`), including authenticated upload, private download/readback, and cleanup.
- Markdown/docs-only commits are intentionally excluded from CI/CodeQL triggers, so documentation commits do not create new red/green runs.

Remaining acceptance criteria:
- Provider-level Supabase Storage, private B2/S3, Google Drive E2E, and deployed application private-B2 proxy E2E are verified. B2 application proxy evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38049146602.
- Deterministic retry/recovery tests exist, but live retry, stale-claim reclamation, and controlled failure/recovery remain PENDING until production durable-state evidence is captured.
- Duplicate-delivery/idempotency has deterministic test coverage, but live QStash duplicate-delivery behavior remains PENDING.
- QStash US-region signature validation is verified; durable delivery/completion/idempotency remain pending because the historical EU-region message returned HTTP 401 Invalid QStash signature.
- Cloudinary E2E remains verified.
- Production authentication/API smoke is VERIFIED by run #11: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37899971474.
- Synthetic /health probing has a passing observation, but request/error telemetry, alert-path verification, and SLO/error-budget observation remain PENDING.
- RAG ingest → embed → search passes.
- Agent → Brain → approval → Publish/resume remains PENDING for production end-to-end evidence.
- Approval → resume → completion remains PENDING for production end-to-end evidence.
- A scheduled workflow crossing a real time boundary remains PENDING.
- Newsletter delivery remains PENDING; endpoints return HTTP 501 until a transactional email provider is configured.
- Controlled provider failover remains PENDING.

Verification rule: implementation, configuration, or unit tests do not substitute for live evidence.

## Pre-staged Phase Plan

### Phase 7 — Live provider + workflow reliability closure
- Deterministic retry-recovery/exhaustion and scheduled-delay semantics are now staged and green in the non-live suite.
- Deterministic stale-claim, terminal-idempotency, duplicate-delivery, and approval-resume coverage is also staged/green; live evidence remains the release gate.
Status: ACTIVE.
- Provider-level Supabase Storage, private B2/S3, Google Drive E2E, and deployed application private-B2 proxy E2E are verified; do not rerun absent regression or relevant code/config changes.
- Verify retry/recovery, live stale-claim reclamation, controlled failure recovery, and duplicate delivery. Deterministic stale-claim reclamation coverage is already green.
- Keep all live tests opt-in and secret-free in normal CI.
- A manual `.github/workflows/live-release-gates.yml` workflow now consumes GitHub `production` environment secrets, validates required configuration, and runs the selected real-provider E2E without exposing credentials to the repository.
- Exit gate: every item has direct production/provider evidence or an explicit documented blocker.

### Phase 8 — Production AI/RAG and workflow journey closure
- RAG source re-ingestion now has deterministic idempotency coverage.
- Production RAG ingest→embed→search/citation is VERIFIED by run #38227390320 attempt 4. Next live gates: Agent→Brain→publish, approval→resume→completion, and scheduled time-boundary execution.
Status: PRE-STAGED.
- Production Auth Smoke run #11 is verified; rerun only if credentials/config change or a new failure occurs.
- RAG ingest → embed → search.
- Agent → Brain → publish.
- Approval → resume → completion.
- Scheduled workflow across a real time boundary.
- Newsletter delivery.
- Controlled external-provider failover.
- Exit gate: complete business journeys are observed end-to-end with durable final state.

### Phase 9 — Source-to-content quality and publishing controls
- Deterministic brain publish idempotency is covered.
- Publication now rejects `publish_now` for unapproved brain items and rejects empty publishable content.
Status: PARTIALLY IMPLEMENTED.
- Universal source → publish E2E, gated on Phase 7/8.
- Provenance to file/page/sheet/row/URL.
- SEO/news quality validation: metadata, structured data, freshness, attribution, corroboration, publication QA.
- Human approval and auditable publish decisions.
- Exit gate: publishing claims are evidence-backed and traceable.

### Phase 10 — Chat/session operations
- Owner-scoped transcript export is now implemented and test-covered; message ordering is deterministic and deleted/non-owner sessions are not exportable.
- Existing pagination, retention soft-delete, ownership transfer, and audit invariants remain staged for broader operational controls.
Status: PRE-STAGED.
- Paginated chat restore and transcript export.
- Explicit retention controls, approved purge, administrator lookup.
- Transfer confirmation and role-based transfer permissions.
- Session activity search and operational audit reporting.
- Exit gate: session lifecycle is durable, permissioned, auditable, and test-covered.

### Phase 11 — RAG observability and quality
- Durable `rag_observability_events` storage and repository migration `20261008_0012` are implemented.
- RAG error telemetry, quality feedback, and A/B configuration persistence hooks are staged; full alert lifecycle, retention/export, statistical evaluation, and live operational verification remain.
Status: PARTIALLY IMPLEMENTED.
- Durable RAG metrics/alert history and notification adapter.
- Rate/window alert policies, retention, pagination, export, and deduplication.
- Read-only/configuration role separation.
- Durable quality feedback and experiment assignment/statistical analysis.
- Cancellable async search and database index telemetry.
- Isolated backend test database/fixtures.
- Correlation-ID investigation and threshold-tuning runbooks.
- Exit gate: RAG quality/operations are measurable and recoverable.

### Phase 12 — Platform evolution and release hardening
- Pre-stage stronger durable execution, external-provider failover contracts, operational telemetry, backup/restore checks, and release rollback tests.
Status: PRE-STAGED.
- Future complex AI workflows and additional integrations.
- Stronger durable job execution.
- Expanded RAG capabilities.
- Advanced analytics/business intelligence.
- Broader observability/operational controls.
- Broader supply-chain intelligence coverage.
- Final release regression, security, dependency, and operational review.

### Phase 13 — Release certification and maintenance checklist (pre-staged)
- Freeze only after live evidence index, security/dependency refresh, backup/restore, DR/rollback, SLO/error-budget review, and documentation reconciliation all pass.
Status: ACTIVE — final evidence closure.
- Formal release-candidate checklist and evidence index.
- Dependency/license/security refresh after feature closure.
- Backup/restore drill and data-integrity verification.
- Disaster-recovery and rollback rehearsal.
- Production SLO/error-budget review and operational ownership.
- Documentation freeze/release notes after evidence reconciliation.
- Exit gate: release candidate is reproducible, rollback-capable, monitored, and fully documented.

## Deferred Items

- Final AI-agent live verification requiring real provider credentials and authenticated production tests.
- Universal one-click source → publish claims until provenance, SEO, fact/source QA, human approval, and provider/storage E2E are jointly verified.

## Blocked Items

- **PAUSED at owner direction (2026-10-09): Vercel deployment/check remediation.** Leave build quota, deployment refresh, and Vercel integration work untouched until explicitly resumed.
- Live-gate workflows are implemented, but production evidence depends on the user running manual GitHub Actions workflows with production environment secrets configured. Secret values must not be shared in chat or committed to the repository.

## 2026-10-12 production smoke deployment race

- [x] Run #12 exposed a race between the push-triggered workflow and Render deployment; PR #79 waits for the new RAG status schema before calling the provider-smoke endpoint.
- [x] Historical rollout gate closed by Production Auth Smoke #38227390320 attempt 4: Voyage 512-D ingestion/retrieval/citation verified. Current production is `RAG_EMBEDDING_VERSION=2`, mode `voyage_only`; overall release remains pending for independent gates.

## 2026-10-12 production Voyage smoke and approved-source gate

- [x] Added an admin-only provider smoke endpoint that validates the configured Voyage model and 512-D output without persisting a vector.
- [x] Added a production-auth workflow trigger for RAG code/workflow changes. It uses existing production environment secrets, logs only sanitized model/dimension metadata, and skips all ingestion while embedding version is 1.
- [x] Bulk RAG ingestion now indexes only approved/published Brain records; direct ingestion of pending/rejected drafts returns HTTP 409. The workflow can sync configured public RSS feeds without implicit ingestion, then ingest once and verify Voyage chunks plus citation-bearing search results when version 2 is enabled.
- [x] Local backend suite: 168 passed, 2 non-failing warnings; workflow YAML and shell syntax validation passed.
- [x] These rollout gates were later closed by Production Auth Smoke run #38227390320 attempt 4 (7 sources, 7 valid Voyage chunks, 5 retrieval matches, non-empty citation). The 125 pending/private Brain drafts remain untouched.

## 2026-10-12 RAG v2 fallback-vector safety

- [x] Identified a code-path gap: with RAG_EMBEDDING_VERSION=2, a legacy hash:fallback vector could still be written to the legacy 768-D column even when the Voyage 512-D vector succeeded.
- [x] PR #77 changes v2-only rows to store no legacy vector, skips the legacy pgvector write, and keeps retrieval model-space-safe.
- [x] Local backend suite: 164 passed, 2 non-failing warnings.
- [x] Historical rollout gate closed: PR #77 and follow-up fixes are merged/deployed; production E2E run #38227390320 attempt 4 verified 7 valid Voyage 512-D chunks and citation-bearing retrieval. Current production is v2 / `voyage_only`; do not roll back to v1 without a deliberate re-embedding plan.

## 2026-10-12 scheduler cadence follow-up

- [x] PR #76 calculates the remaining cooldown from the durable last-attempt timestamp, avoiding a fresh full 24-hour sleep after each cold start.
- [x] Targeted scheduler tests: 10 passed; full backend suite: 163 passed, 2 non-failing warnings.
- [ ] Follow-up deployment and next scheduled-cycle observation remain pending.

## 2026-10-12 production Voyage smoke readiness fix

- [x] Bounded five-minute wait for the deployed admin RAG status schema merged and deployed: Render deploy `dep-db66a5tckfvc73c9usc0`, commit `1a3085f610cf7376b72e14f4e995c28618f9d430`.
- [x] Render startup completed and public `/health` returned HTTP 200 after a brief HTTP 502 during the deployment window.
- [x] Later Production Auth Smoke run #38227390320 attempt 4 verified provider smoke, ingestion, vector shape/model, retrieval, and citation. Current RAG E2E gate is VERIFIED; overall release remains pending for other gates.

## 2026-10-12 scheduler restart duplicate-preview fix

- [x] Root cause identified: the scheduler runs immediately on every process start before sleeping for the configured interval. Production records 123–125 show repeated private Daily Preview drafts over roughly 32 minutes during service restarts.
- [x] Fix staged in PR #75: persist a scheduler cooldown in app_settings before provider work and bootstrap the first cooldown from recent preview/agent records. Manual preview route remains independent.
- [x] Local backend suite: 159 passed, 2 non-failing warnings.
- [ ] Local backend suite: 163 passed. First post-deploy startup is verified: scheduler cooldown key is present, total Brain rows remain 125, and zero Daily Preview rows were created after deployment. Follow-up PR #76 calculates the remaining cooldown after restarts so the interval does not drift; observe the next 24-hour cycle after deployment before closing the long-interval gate. Existing private pending Brain records were preserved; no production rows were deleted or ingested.

## 2026-10-12 frontend hardening follow-up

- [x] Frontend dependency install from the updated lockfile passed; frontend tests passed (35 files, 83 tests).
- [x] Production build passed with bounded Next.js build workers (`experimental.cpus=2`), avoiding worker-spawn exhaustion in constrained build containers; the RAG index page hook-dependency warning was fixed using `useCallback`.
- [x] Production-only npm audit: 0 findings. After PR #114, full dev-inclusive audit reports 7 findings (7 high, 0 moderate), predominantly the Tailwind 3 / Next ESLint tooling dependency chain. CI #38424954202, CodeQL #38424954119, and Vercel preview check passed on the merged PR head. No forced Tailwind 4 major migration was applied.
- [ ] Dev-toolchain advisories need a compatible major-version remediation plan and full validation.
- [ ] QStash live durable workflow completion/idempotency needs a new successful signed run; the 2026-10-12 signature-only smoke did not create workflow state.

## 2026-10-12 regression validation

- [x] Workflow execution/orchestration tests use isolated in-memory SQLite fixtures and no longer depend on an implicit pre-existing `workflow_runs` table.
- [x] Targeted workflow tests: 10 passed; full backend suite: 153 passed.
- [x] PR #73 merged as `cc91b9c0f78e603584a6bbe7737ebf189b758344`; CI #592 and CodeQL #339 passed.
- [ ] Live workflow recovery, Agent→Brain→Publish, approval/resume, scheduler boundary, SLO/alerting, rollback/DR, newsletter, and provider failover gates remain open. Production RAG ingest→search/citation is VERIFIED by run #38227390320 attempt 4.

## Remaining Work — Release Closure

### Audit follow-up (2026-10-09)
- [x] Vercel work explicitly paused by owner; no Vercel build/deploy action is part of the active release-closure sequence.
- [x] Cross-check repository, Render, Vercel, and Supabase live state; see `docs/REPO_INFRA_AUDIT.md`.
- [x] Reconcile stale migration-head and RAG telemetry statements in canonical docs.
- [x] Patch production dependency `fflate` 0.6.10 → 0.6.11; production npm audit and backend pip-audit are clean, and CI #452 / CodeQL #199 passed.
- [x] Reviewed the remaining dev-inclusive npm audit findings on 2026-10-13. Baseline full audit reported 8 findings (7 high, 1 moderate); PR #114 fixed the moderate parser advisory, leaving 7 high dev-tooling findings. Production-only audit remains clean. The Tailwind 3 dependency chain includes vulnerable `braces`/`chokidar`/`micromatch`, and npm proposes Tailwind 4 as a major-version remediation. No forced Tailwind 4 upgrade was applied; compatible remediation and frontend regression testing remain a separate open security task.
- [ ] Configure the missing GitHub `production` environment auth secrets identified by the failed preflight (`SUPABASE_PUBLISHABLE_KEY`, `PRODUCTION_ADMIN_EMAIL`, `PRODUCTION_ADMIN_PASSWORD`, `PRODUCTION_API_URL`), then rerun the auth smoke.
- [ ] Set backup source/restore URLs to TLS-enabled shared Session Pooler URLs on port 5432; validate production identity `ephrnmigiwjhdjksreos` and isolated restore identity `bxvykaijlrqjvlhtumpg`; rerun the backup/restore gate.
- [x] Historical configuration check: live health reported upload_storage_configured=true and missing_env=[] after the prior public-base setting; this did not prove B2 file delivery.
- [ ] Run and record the real B2 upload/read/delete provider gate; health configuration is not E2E proof.
- [ ] After deploying private B2 download support, run provider live-release gates (Supabase Storage, B2 authenticated upload/read/delete, Google Drive) with the required provider credentials; S3_PUBLIC_BASE_URL is optional.
- [ ] Perform production workflow/RAG/publish/scheduler and failure-recovery journeys; no mock-only evidence counts as production verification.
- [ ] Complete rollback rehearsal, post-rollback data-integrity checks, and SLO/error-budget review before release freeze.


Deterministic repository-side coverage has expanded for RAG ingest/search, publish idempotency, and chat transcript export. These are not substitutes for live production evidence.

1. Deployed application private-B2 proxy E2E.
2. Workflow retry/recovery verification.
3. Stale-claim recovery verification.
4. Controlled failure/recovery verification.
5. Production monitoring/failure-mode checks.
6. E2E RAG ingest → embed → search.
7. Agent → Brain → publish E2E.
8. Workflow approval → resume → completion.
9. Scheduled workflow over a real time boundary.
10. Newsletter delivery E2E.
11. Controlled external-provider failover test.

## Remaining Work — Future Product/Operations

1. Universal source → publish E2E.
2. Source provenance preservation to file/page/sheet/row/URL.
3. SEO/news quality validation.
4. Paginated chat restore.
5. Transcript export.
6. Explicit retention controls.
7. Administrator lookup.
8. Transfer confirmation.
9. Role-based transfer permissions.
10. Reviewable retention policy.
11. Approved purge workflow.
12. Session activity search.
13. Operational audit reporting for sessions.
14. Complete durable RAG metrics/alert history rollout after migration 0012 is applied to production.
15. Real notification adapter.
16. Rate/window alert policies.
17. Durable alert retention/pagination/export.
18. Read-only/configuration role separation for RAG dashboard.
19. Durable quality feedback.
20. Experiment assignment/statistical analysis.
21. Cancellable async search.
22. Database index telemetry.
23. Isolated backend test database/fixtures.
24. Supported notification provider/threat-model decision.
25. Durable metrics retention + deduplication.
26. Correlation-ID investigation runbook.
27. Threshold-tuning runbook.
28. Future complex AI workflows.
29. More external integrations.
30. Stronger durable job execution.
31. Expanded RAG capabilities.
32. Advanced analytics/business intelligence.
33. Broader observability/operational controls.
34. Broader supply-chain intelligence coverage.

CI #535 / CodeQL #282 passed on merged diagnostics SHA `896c3d0b1086799883b4128bb5ed3d088c5965d3` (CI: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38028420417; CodeQL: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38028420358). Render deploy `dep-db4t0iavcj2c73e3snu0` confirmed that diagnostics SHA live on 2026-10-10. The previously pending B2 application proxy gate was subsequently verified by production run [#38049146602](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38049146602), including private upload, download/readback, and cleanup. Render startup logs also observed OpenRouter HTTP 429 causing the scheduled AI preview to fail; keep production RAG/AI pending and do not enable paid fallback without owner approval. Production migration parity is closed; live provider and production-path evidence remains separate. Cloudinary remains verified. QStash durable delivery/completion/idempotency is pending after the 2026-10-12 log reconciliation; only US-region signature validation has current direct evidence.

## Release Gate Remediation — 2026-10-09

- [x] Investigated latest manual gate failures using the actual GitHub Actions job logs.
- [x] Fixed Live Release Gates test selection: removed `PYTEST_ADDOPTS` collision, selected the test path explicitly, and set B2 as the default provider for manual dispatch.
- [x] Historical B2 test strengthening verified public GET in addition to S3 API operations; this was superseded because the owner needs a Private bucket.
- [x] Fixed backup TLS preflight so a shared Session Pooler URL without a query parameter is normalized to `sslmode=require`; explicit insecure SSL modes are rejected.
- [x] Fixed backup data restore to set replication role in the same psql session that imports data.
- [x] Validated shell syntax, embedded Python syntax, test module syntax, target path, and URL normalization using synthetic URLs.
- [ ] Owner: rerun [Live Release Gates](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/blob/main/.github/workflows/live-release-gates.yml) with provider `b2` and inspect the actual provider result.
- [ ] Owner: rerun [Production Backup Restore](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/blob/main/.github/workflows/production-backup-restore.yml) and resolve any dump/restore-stage errors.
- [x] Production Auth Smoke run #11 passed: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37899971474
- [ ] Do not mark B2 or backup/restore verified until the fresh live runs pass end-to-end.


### 2026-10-09 live gate follow-up

- Historical B2 public-GET failure is documented above. Follow-up implementation now supports a Private bucket through an application download proxy; deploy and run the authenticated B2 gate plus application URL verification before closing this item.
- Backup/restore run #3 completed connectivity, production logical backup, and isolated schema reset, but Supabase rejected role-only replay (`log_min_messages` permission). Workflow now skips replay of Supabase-managed roles and must be rerun to verify schema/data restoration.


## 2026-10-11 Consolidated release closure checklist

The following are **not yet release-certified** and must not be marked VERIFIED without direct evidence:

- [x] In-process queue claim transient-retry implementation and regression test merged by PR #107 (`d950ae7`); CI/CodeQL passed and Render deployment `dep-db73qe6q1p3s73evdap0` is live. [ ] Verify durable QStash delivery/completion/idempotency and live stale-claim/failure recovery in production.
- [x] Production RAG ingest → embed → search/citation, verified by run #38227390320 attempt 4. [ ] Agent → Brain → publish, with durable final state and provenance.
- [ ] Approval → resume → completion and scheduled execution across a real time boundary.
- [ ] Newsletter delivery and controlled provider failover. Newsletter endpoints currently return HTTP 501 until a transactional email provider is connected.
- [ ] Full authenticated Admin UI browser verification (not just login rendering, unauthenticated redirect, or API smoke).
- [ ] Managed Supabase Auth/Storage recovery, object-storage disaster recovery, and application rollback rehearsal. The successful isolated public-schema restore is narrower than these gates.
- [x] Synthetic `/health` probe passed after PR #105: run #38412066986 returned HTTP 200 in 5.962 seconds on attempt 1. [ ] Production SLO/error-budget calculation from request/error telemetry, auditable query/export, alert-path test, and required observation window. Render HTTP request/latency metrics remain unavailable, so request-level SLO pass is not evidenced.
- [ ] Dependency/license/security refresh review. Supabase Auth leaked-password protection is a documented Free-plan limitation per issue #56, not an actionable blocker unless the plan/settings change.
- [ ] Resolve OpenRouter free-tier HTTP 429 without enabling paid fallback unless explicitly authorized.
- [ ] Vercel integration check/remediation remains owner-paused and requires explicit approval before work resumes.

Verified production B2 proxy evidence remains run #38049146602 (`2 passed in 12.32s`). Other verified evidence is indexed in `docs/RELEASE_CERTIFICATION.md` and `docs/RELEASE_EVIDENCE.md`. This checklist is the release exit list, not a claim that these tests have already run.

## 2026-10-11 — Workflow and Agent/RAG hardening follow-up

- [x] Restore executor completed_nodes from durable run state after process restart.
- [x] Reclaim a running scheduled job whose claimed_at is missing.
- [x] Define the sanitized objective in build_steps() and HTML-escape untrusted values in local Agent draft markup.
- [x] Add deterministic regression tests for those cases.
- [x] CI #564 passed: backend 199 passed / 5 skipped; agents, frontend tests/build, and dependency security job passed. CodeQL #311 passed for Python and JavaScript/TypeScript.
- [x] Render deployment for commit 4f530837fc148e44be2f6cb0ecb0a5f291278be2 reached live.

Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38116906548 · https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38116906581

These checks close the code-regression/CI gate for that patch only. Production RAG ingestion/search/citation was later verified by run #38227390320 attempt 4. Workflow recovery, stale-claim live verification, Agent→Brain→Publish, approval/resume, and scheduled time-boundary gates remain PENDING.

## 2026-10-11 — Publishing safety follow-up

- [x] Escape untrusted imported-draft text before backend Markdown-to-HTML conversion.
- [x] Escape untrusted CLI publisher draft text before HTML conversion.
- [x] Regression tests passed in CI #569: backend 200 passed / 5 skipped; agents 5 passed; frontend tests/build and dependency security passed.
- [x] CodeQL #316 passed for Python and JavaScript/TypeScript.
- [x] Render deploy dep-db5ifnprn11c73dg9ak0 reached live for code commit 8f8397f16d74281d1072ed3b8cb8bd5017a2c5c1 

Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38117114461 · https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38117114411

Production workflow recovery and RAG→Agent→Brain→Publish live journeys are still unchecked release gates. CI/deployment is not live E2E evidence.

## 2026-10-12 — RAG production verification and remaining gates

- [x] Live `/health` request returned HTTP 200; database and pgvector were reported healthy.
- [x] Read-only production counts reconfirmed migration `20261011_0013`, 122 pending Brain records, and zero RAG embedding/source/file rows. Evidence is recorded in `CURRENT_STATE.md` and `docs/RELEASE_EVIDENCE.md`.
- [ ] Verify Voyage API credentials with a real provider call from the deployed backend; a configured secret is not proof that the API accepts it.
- [ ] Obtain an authorized admin bearer token through the approved secret/auth workflow; unauthenticated RAG endpoints return HTTP 401. Do not bypass authentication or expose secrets.
- [x] Controlled public RSS ingestion with Voyage v2, model/dimension checks, and zero ingestion errors passed in run #38227390320 attempt 4. Pending/private Brain drafts remain excluded.
- [ ] Verify live retrieval and citation provenance; keep release PENDING until these checks and remaining release gates pass.
- [ ] Triage full local backend suite failures/errors separately. PR #73 isolates two RAG search tests from external provider credentials; targeted RAG tests passed (21 passed), but the complete local suite did not pass.

## Historical partial production Voyage ingestion (superseded by verified E2E above)

- [x] Provider smoke passed with voyage-3-lite, 512 dimensions, and no persistence.
- [x] At this intermediate stage, RSS sync had 5 source records and 2 valid Voyage v2 chunks; the latest run now verifies 7 sources and 7 valid chunks.
- [x] PR #81 adds bounded retry for transient Voyage 429/5xx and connection/timeouts; permanent 4xx fails closed.
- [x] PR #84 and follow-up fixes are merged/deployed. Run #38227390320 attempt 4 verified Voyage-only ingestion and citation-bearing retrieval. Overall release remains PENDING for independent non-RAG gates.


## 2026-10-12 Release closure implementation update

- [x] Added deterministic Agent → Brain → approve → publish → soft-unpublish API integration coverage; PR #93 merged, CI #641 passed, CodeQL #389 passed.
- [x] Added manual authenticated production Admin UI browser smoke workflow. Production execution remains pending until `PRODUCTION_FRONTEND_URL` and other production environment secrets are confirmed.
- [x] Added 15-minute synthetic `/health` probe, 30-day probe artifacts, and configurable webhook alert delivery/test mode. This is not real-request SLO/error-budget certification; run the manual alert test and collect the complete observation window.
- [x] Expanded controlled DR/rollback rehearsal steps; no production rollback or destructive restore was executed.
- [ ] Overall release remains PENDING until live Agent→Brain→Publish, authenticated Admin UI, alert-path, workflow recovery, scheduler boundary, object-storage recovery, rollback/DR, and SLO/error-budget gates have direct evidence.
