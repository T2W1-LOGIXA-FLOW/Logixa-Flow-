# Logixa Flow — Roadmap

> Owner: Project / Engineering
> Update when: a phase, release gate, deferred item, or backlog item changes status
> Last Updated: 2026-10-12
> Do NOT put here: detailed implementation instructions; use domain docs and runbooks.

## Completed Phases

### Phase 0 — Documentation audit and migration ledger
Status: VERIFIED. Evidence: 12 Markdown files were audited and ledgers A–E were built. No orphan file, plan, or decision was identified.

### Repository hardening and platform foundations
Status: DONE / VERIFIED at repository level, with release certification still pending. Repository/live Alembic revision is `20261011_0013`; the Voyage v2 path is additive and the legacy 768-D path remains the active rollback path. Latest merged patch validation: PR #73 merged as `cc91b9c0f78e603584a6bbe7737ebf189b758344`; CI #592 and CodeQL #339 passed, and Render deploy `dep-db65h2mk1f9s73evo9mg` reached live. Production `document_embeddings=0`, `intelligence_sources=0`, and `ai_memory_brain=122`; no production RAG ingest→search/citation E2E has been evidenced. OpenRouter HTTP 429 affects scheduled AI preview. Live workflow recovery, AI business journeys, monitoring/SLO, newsletter/failover, managed Auth/Storage and object-storage recovery, rollback, and authenticated Admin UI remain open.

## Active Phase

**Release status: PENDING.** Production migration `20261011_0013` is applied, but production RAG tables are empty (`document_embeddings=0`, `intelligence_sources=0`) while `ai_memory_brain=122`. OpenRouter HTTP 429 was observed during scheduled preview. Keep `RAG_EMBEDDING_VERSION=1`; do not claim a zero-row backfill is complete or enable paid fallback without owner approval. Most recent CI #592 / CodeQL #339 passed for PR #73, but live production journey gates remain separate.

### Phase 13 — Release certification and maintenance

Objective: close the remaining production/provider/recovery evidence gates and freeze only when the release evidence index is complete.

Current state (2026-10-11): production migration `20261011_0013` is applied; `20261008_0012_rag_observability` remains part of the migration history. Cloudinary, Supabase Storage upload/read/cleanup, private B2/S3 provider and deployed application proxy, Google Drive upload/read, QStash core delivery/completion, production auth smoke, and public-schema logical backup/restore have live evidence. Remaining gates are workflow recovery, RAG/AI business journeys, newsletter/failover, object-storage/managed Auth-Storage recovery, rollback, monitoring/SLO, and full authenticated Admin UI verification.

### Final live-infrastructure verification

Objective: close evidence-based release gates without changing the current architecture merely to satisfy documentation.

Current verified baseline:
- Earlier application-code CI #535 / CodeQL #282 passed on diagnostics SHA `896c3d0b1086799883b4128bb5ed3d088c5965d3` (https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38028420417; https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38028420358).
- Latest merged patch validation: CI #592 and CodeQL #339 passed on PR #73 (https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38201060689; https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38201060691); Render deployment `dep-db65h2mk1f9s73evo9mg` reached live.
- The deployed application private-B2 proxy E2E passed in production verification run #38049146602 (`2 passed in 12.32s`), including authenticated upload, private download/readback, and cleanup.
- Markdown/docs-only commits are intentionally excluded from CI/CodeQL triggers, so documentation commits do not create new red/green runs.

Remaining acceptance criteria:
- Provider-level Supabase Storage, private B2/S3, Google Drive E2E, and deployed application private-B2 proxy E2E are verified. B2 application proxy evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38049146602.
- Retry, stale-claim recovery, and failure recovery are verified.
- Duplicate-delivery protection remains verified.
- QStash signature verification, delivery, and canonical workflow completion remain verified.
- Cloudinary E2E remains verified.
- Production authentication/API smoke is VERIFIED by run #11: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37899971474.
- Monitoring and failure-mode checks pass.
- RAG ingest → embed → search passes.
- Agent → Brain → publish passes.
- Approval → resume → completion passes.
- Scheduled workflow crosses a real time boundary.
- Newsletter delivery passes.
- Controlled provider failover passes.

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
- Next live gates: RAG ingest→embed→search, Agent→Brain→publish, approval→resume→completion, and scheduled time-boundary execution.
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

### Phase 13 — Release certification and maintenance
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

## 2026-10-12 regression validation

- [x] Workflow execution/orchestration tests use isolated in-memory SQLite fixtures and no longer depend on an implicit pre-existing `workflow_runs` table.
- [x] Targeted workflow tests: 10 passed; full backend suite: 153 passed.
- [x] PR #73 merged as `cc91b9c0f78e603584a6bbe7737ebf189b758344`; CI #592 and CodeQL #339 passed.
- [ ] Live workflow recovery, RAG ingest→embed→search/citation, Agent→Brain→Publish, approval/resume, scheduler boundary, SLO/alerting, rollback/DR, newsletter, and provider failover gates remain open.

## Remaining Work — Release Closure

### Audit follow-up (2026-10-09)
- [x] Vercel work explicitly paused by owner; no Vercel build/deploy action is part of the active release-closure sequence.
- [x] Cross-check repository, Render, Vercel, and Supabase live state; see `docs/REPO_INFRA_AUDIT.md`.
- [x] Reconcile stale migration-head and RAG telemetry statements in canonical docs.
- [x] Patch production dependency `fflate` 0.6.10 → 0.6.11; production npm audit and backend pip-audit are clean, and CI #452 / CodeQL #199 passed.
- [x] Reviewed the remaining dev-inclusive npm audit findings on 2026-10-12. Baseline full audit reports 8 findings (7 high, 1 moderate); the CI production-only audit remains green. The Tailwind 3 dependency chain includes vulnerable `braces`/`chokidar`/`micromatch`, and npm proposes Tailwind 4 as a major-version remediation. No forced Tailwind 4 upgrade was applied; compatible remediation and frontend regression testing remain a separate open security task.
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

CI #535 / CodeQL #282 passed on merged diagnostics SHA `896c3d0b1086799883b4128bb5ed3d088c5965d3` (CI: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38028420417; CodeQL: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38028420358). Render deploy `dep-db4t0iavcj2c73e3snu0` confirms diagnostics SHA `896c3d0b1086799883b4128bb5ed3d088c5965d3` live as of 2026-10-10 05:43:30Z; the targeted production B2 proxy gate is now ready to rerun. Render startup logs also observed OpenRouter HTTP 429 causing the scheduled AI preview to fail; keep production RAG/AI pending and do not enable paid fallback without owner approval. Production migration parity is closed; live provider and production-path evidence remains separate. Cloudinary and the core QStash delivery/completion/idempotency path are also no longer listed as remaining work because they have real evidence.

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

- [ ] Live workflow retry/recovery, stale-claim reclamation, controlled failure recovery, and recovery observability.
- [ ] Production RAG ingest → embed → search and Agent → Brain → publish, with durable final state and provenance.
- [ ] Approval → resume → completion and scheduled execution across a real time boundary.
- [ ] Newsletter delivery and controlled provider failover. Newsletter endpoints currently return HTTP 501 until a transactional email provider is connected.
- [ ] Full authenticated Admin UI browser verification (not just login rendering, unauthenticated redirect, or API smoke).
- [ ] Managed Supabase Auth/Storage recovery, object-storage disaster recovery, and application rollback rehearsal. The successful isolated public-schema restore is narrower than these gates.
- [ ] Production SLO/error-budget calculation from request/error telemetry, auditable query/export, alert-path test, and required observation window. Current Render HTTP request/latency metrics were unavailable, so no SLO pass is evidenced.
- [ ] Dependency/license/security refresh review and follow-up for the Supabase Auth leaked-password-protection warning.
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

These checks close the code-regression/CI gate for this patch only. They do not close production workflow recovery, stale-claim live verification, RAG ingestion/search, Agent→Brain→Publish, approval/resume, or scheduled time-boundary gates. Release remains PENDING.

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
- [ ] Run controlled Brain ingestion with Voyage v2 only after provider smoke succeeds; verify model name, 512-D dimensions, durable row counts, and zero unembedded source chunks.
- [ ] Verify live retrieval and citation provenance; keep release PENDING until these checks and remaining release gates pass.
- [ ] Triage full local backend suite failures/errors separately. PR #73 isolates two RAG search tests from external provider credentials; targeted RAG tests passed (21 passed), but the complete local suite did not pass.
