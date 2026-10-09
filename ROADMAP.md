# Logixa Flow — Roadmap

> Owner: Project / Engineering
> Update when: a phase, release gate, deferred item, or backlog item changes status
> Last Updated: 2026-10-08
> Do NOT put here: detailed implementation instructions; use domain docs and runbooks.

## Completed Phases

### Phase 0 — Documentation audit and migration ledger
Status: VERIFIED. Evidence: 12 Markdown files were audited and ledgers A–E were built. No orphan file, plan, or decision was identified.

### Repository hardening and platform foundations
Status: DONE / VERIFIED at repository level. Repository evidence includes the canonical workflow router, Alembic chain through repository head 20261008_0012, Render Free configuration, QStash integration, storage routing, AI/RAG implementation, and CI controls. Latest main CI and CodeQL are green. Live provider and production-path verification remains separate.

## Active Phase

### Phase 13 — Release certification and maintenance

Objective: close the remaining production/provider/recovery evidence gates and freeze only when the release evidence index is complete.

Current state: production migration `20261008_0012_rag_observability` is applied. Repository-side SLO/error-budget and release-evidence artifacts are staged. Live provider, workflow recovery, AI/RAG journey, newsletter/failover, backup/restore, rollback, and monitoring evidence remain.

### Final live-infrastructure verification

Objective: close evidence-based release gates without changing the current architecture merely to satisfy documentation.

Current verified baseline:
- Latest confirmed CI: #450 success on `115482a27a9c7d56294c8fe09940190555a8d7a1`.
- Latest confirmed CodeQL: #197 success on the same commit.
- Markdown/docs-only commits are intentionally excluded from CI/CodeQL triggers, so documentation commits do not create new red/green runs.

Remaining acceptance criteria:
- Supabase Storage, B2, and Google Drive E2E pass with real infrastructure.
- Retry, stale-claim recovery, and failure recovery are verified.
- Duplicate-delivery protection remains verified.
- QStash signature verification, delivery, and canonical workflow completion remain verified.
- Cloudinary E2E remains verified.
- Production authentication/API smoke tests pass.
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
- Close Supabase Storage, Backblaze B2, and Google Drive real E2E.
- Verify retry/recovery, live stale-claim reclamation, controlled failure recovery, and duplicate delivery. Deterministic stale-claim reclamation coverage is already green.
- Keep all live tests opt-in and secret-free in normal CI.
- A manual `.github/workflows/live-release-gates.yml` workflow now consumes GitHub `production` environment secrets, validates required configuration, and runs the selected real-provider E2E without exposing credentials to the repository.
- Exit gate: every item has direct production/provider evidence or an explicit documented blocker.

### Phase 8 — Production AI/RAG and workflow journey closure
- RAG source re-ingestion now has deterministic idempotency coverage.
- Next live gates: RAG ingest→embed→search, Agent→Brain→publish, approval→resume→completion, and scheduled time-boundary execution.
Status: PRE-STAGED.
- Production authentication/API smoke.
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

## Remaining Work — Release Closure

### Audit follow-up (2026-10-09)
- [x] Vercel work explicitly paused by owner; no Vercel build/deploy action is part of the active release-closure sequence.
- [x] Cross-check repository, Render, Vercel, and Supabase live state; see `docs/REPO_INFRA_AUDIT.md`.
- [x] Reconcile stale migration-head and RAG telemetry statements in canonical docs.
- [x] Patch production dependency `fflate` 0.6.10 → 0.6.11; production npm audit and backend pip-audit are clean, and CI #452 / CodeQL #199 passed.
- [ ] Review remaining **dev-only** npm audit findings in the Tailwind 3 toolchain (`braces` and `postcss-selector-parser`). Production-only npm audit is clean; `npm audit --force` proposes a Tailwind 4 major upgrade, so do not force-upgrade without a separate compatibility/test pass.
- [ ] Configure the missing GitHub `production` environment auth secrets identified by the failed preflight (`SUPABASE_PUBLISHABLE_KEY`, `PRODUCTION_ADMIN_EMAIL`, `PRODUCTION_ADMIN_PASSWORD`, `PRODUCTION_API_URL`), then rerun the auth smoke.
- [ ] Set backup source/restore URLs to TLS-enabled shared Session Pooler URLs on port 5432; validate production identity `ephrnmigiwjhdjksreos` and isolated restore identity `bxvykaijlrqjvlhtumpg`; rerun the backup/restore gate.
- [ ] **B2 follow-up:** owner reports `S3_PUBLIC_BASE_URL` was added in Render; confirm live `/health` clears the missing-env warning and the B2 upload/read/delete gate passes before marking it verified.
- [ ] Run provider live-release gates (Supabase Storage, B2 with `S3_PUBLIC_BASE_URL`, Google Drive) only after confirming the production environment secrets are configured.
- [ ] Perform production workflow/RAG/publish/scheduler and failure-recovery journeys; no mock-only evidence counts as production verification.
- [ ] Complete rollback rehearsal, post-rollback data-integrity checks, and SLO/error-budget review before release freeze.


Deterministic repository-side coverage has expanded for RAG ingest/search, publish idempotency, and chat transcript export. These are not substitutes for live production evidence.

1. Real Supabase Storage E2E.
2. Real Backblaze B2 E2E.
3. Real Google Drive E2E.
4. Workflow retry/recovery verification.
5. Stale-claim recovery verification.
6. Controlled failure/recovery verification.
7. Production authentication/API smoke tests.
8. Production monitoring/failure-mode checks.
9. E2E RAG ingest → embed → search.
10. Agent → Brain → publish E2E.
11. Workflow approval → resume → completion.
12. Scheduled workflow over a real time boundary.
13. Newsletter delivery E2E.
14. Controlled external-provider failover test.

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

CI #452 / CodeQL #199 are the latest confirmed green validation on `e46864fad964e24dc60063fb07f46d2f9524e87f` after the `fflate` patch. Docs-only commits after that SHA do not trigger these workflows by design. Any subsequent code/config change must receive a fresh green CI/CodeQL run before certification. Production migration parity is now closed. Live provider and production-path evidence remains separate. Cloudinary and the core QStash delivery/completion/idempotency path are also no longer listed as remaining work because they have real evidence.
