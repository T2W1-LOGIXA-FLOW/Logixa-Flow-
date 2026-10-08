# Logixa Flow — Roadmap

> Owner: Project / Engineering
> Update when: a phase, release gate, deferred item, or backlog item changes status
> Last Updated: 2026-10-08
> Do NOT put here: detailed implementation instructions; use domain docs and runbooks.

## Completed Phases

### Phase 0 — Documentation audit and migration ledger
Status: VERIFIED. Evidence: 12 Markdown files were audited and ledgers A–E were built. No orphan file, plan, or decision was identified.

### Repository hardening and platform foundations
Status: DONE / VERIFIED at repository level. Repository evidence includes the canonical workflow router, Alembic chain through repository head 20261007_0011, Render Free configuration, QStash integration, storage routing, AI/RAG implementation, and CI controls. Latest main CI and CodeQL are green. Live provider and production-path verification remains separate.

## Active Phase

### Final live-infrastructure verification

Objective: close evidence-based release gates without changing the current architecture merely to satisfy documentation.

Current verified baseline:
- Latest-main CI is green: CI run #397 on commit `c26a8bc3`.
- Latest-main CodeQL is green: CodeQL run #144 on commit `c26a8bc3`.

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
Status: ACTIVE.
- Close Supabase Storage, Backblaze B2, and Google Drive real E2E.
- Verify retry/recovery, stale-claim reclamation, controlled failure recovery, and duplicate delivery.
- Keep all live tests opt-in and secret-free in CI.
- Exit gate: every item has direct production/provider evidence or an explicit documented blocker.

### Phase 8 — Production AI/RAG and workflow journey closure
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
Status: PRE-STAGED.
- Universal source → publish E2E, gated on Phase 7/8.
- Provenance to file/page/sheet/row/URL.
- SEO/news quality validation: metadata, structured data, freshness, attribution, corroboration, publication QA.
- Human approval and auditable publish decisions.
- Exit gate: publishing claims are evidence-backed and traceable.

### Phase 10 — Chat/session operations
Status: PRE-STAGED.
- Paginated chat restore and transcript export.
- Explicit retention controls, approved purge, administrator lookup.
- Transfer confirmation and role-based transfer permissions.
- Session activity search and operational audit reporting.
- Exit gate: session lifecycle is durable, permissioned, auditable, and test-covered.

### Phase 11 — RAG observability and quality
Status: PRE-STAGED.
- Durable RAG metrics/alert history and notification adapter.
- Rate/window alert policies, retention, pagination, export, and deduplication.
- Read-only/configuration role separation.
- Durable quality feedback and experiment assignment/statistical analysis.
- Cancellable async search and database index telemetry.
- Isolated backend test database/fixtures.
- Correlation-ID investigation and threshold-tuning runbooks.
- Exit gate: RAG quality/operations are measurable and recoverable.

### Phase 12 — Platform evolution and release hardening
Status: PRE-STAGED.
- Future complex AI workflows and additional integrations.
- Stronger durable job execution.
- Expanded RAG capabilities.
- Advanced analytics/business intelligence.
- Broader observability/operational controls.
- Broader supply-chain intelligence coverage.
- Final release regression, security, dependency, and operational review.

## Deferred Items

- Final AI-agent live verification requiring real provider credentials and authenticated production tests.
- Universal one-click source → publish claims until provenance, SEO, fact/source QA, human approval, and provider/storage E2E are jointly verified.

## Blocked Items

None established by repository evidence. Live tests may remain operationally unavailable until the required provider credentials/access are supplied.

## Remaining Work — Release Closure

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

18. Universal source → publish E2E.
19. Source provenance preservation to file/page/sheet/row/URL.
20. SEO/news quality validation.
21. Paginated chat restore.
22. Transcript export.
23. Explicit retention controls.
24. Administrator lookup.
25. Transfer confirmation.
26. Role-based transfer permissions.
27. Reviewable retention policy.
28. Approved purge workflow.
29. Session activity search.
30. Operational audit reporting for sessions.
31. Persist RAG metrics/alert history.
32. Real notification adapter.
33. Rate/window alert policies.
34. Durable alert retention/pagination/export.
35. Read-only/configuration role separation for RAG dashboard.
36. Durable quality feedback.
37. Experiment assignment/statistical analysis.
38. Cancellable async search.
39. Database index telemetry.
40. Isolated backend test database/fixtures.
41. Supported notification provider/threat-model decision.
42. Durable metrics retention + deduplication.
43. Correlation-ID investigation runbook.
44. Threshold-tuning runbook.
45. Future complex AI workflows.
46. More external integrations.
47. Stronger durable job execution.
48. Expanded RAG capabilities.
49. Advanced analytics/business intelligence.
50. Broader observability/operational controls.
51. Broader supply-chain intelligence coverage.

CI/CodeQL are intentionally not listed as remaining work because the latest validated main runs are green. Cloudinary and the core QStash delivery/completion/idempotency path are also no longer listed as remaining work because they have real evidence.
