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
- Cloudinary, Supabase Storage, B2, and Google Drive E2E pass with real infrastructure.
- QStash signature verification and delivery to /api/admin/workflow/qstash-dispatch pass.
- Canonical workflow completion is persisted in PostgreSQL.
- Retry, stale-claim recovery, failure recovery, and duplicate-delivery protection are verified.
- Production authentication/API smoke tests pass.
- Monitoring and failure-mode checks pass.
- RAG ingest → embed → search passes.
- Agent → Brain → publish passes.
- Approval → resume → completion passes.
- Scheduled workflow crosses a real time boundary.
- Newsletter delivery passes.
- Controlled provider failover passes.

Verification rule: implementation, configuration, or unit tests do not substitute for live evidence.

## Future Phases

### Source-to-content quality
- Universal source → publish E2E, gated on real storage/provider validation.
- Preserve provenance to file/page/sheet/row/URL.
- SEO/news quality validation covering metadata, structured data, freshness, attribution, corroboration, and publication QA.
- Real production storage/provider validation before universal publishing claims.

### Chat session operations
- Paginated chat restore.
- Transcript export.
- Explicit retention controls.
- Administrator lookup.
- Transfer confirmation.
- Role-based transfer permissions.
- Reviewable retention policy.
- Approved purge workflow.
- Session activity search.
- Operational audit reporting for sessions.

### RAG observability and quality
- Persist RAG metrics and alert history.
- Real notification adapter.
- Rate/window alert policies.
- Durable alert retention, pagination, and export.
- Read-only/configuration role separation for the RAG dashboard.
- Durable quality feedback.
- Experiment assignment/statistical analysis.
- Cancellable async search.
- Database index telemetry.
- Isolated backend test database/fixtures.
- Supported notification provider/threat-model decision.
- Durable metrics retention and deduplication.
- Correlation-ID investigation runbook.
- Threshold-tuning runbook.

### Broader platform evolution
- Future complex AI workflows.
- More external integrations.
- Stronger durable job execution.
- Expanded RAG capabilities.
- Advanced analytics/business intelligence.
- Broader observability/operational controls.
- Broader supply-chain intelligence coverage.

## Deferred Items

- Final AI-agent live verification requiring real provider credentials and authenticated production tests.
- Universal one-click source → publish claims until provenance, SEO, fact/source QA, human approval, and provider/storage E2E are jointly verified.

## Blocked Items

None established by repository evidence. Live tests may remain operationally unavailable until the required provider credentials/access are supplied.

## Remaining Work — Release Closure

1. Real Cloudinary E2E.
2. Real Supabase Storage E2E.
3. Real Backblaze B2 E2E.
4. Real Google Drive E2E.
5. Signed QStash delivery verification.
6. QStash → workflow completion verification.
7. Workflow retry/recovery verification.
8. Stale-claim recovery verification.
9. Duplicate-delivery protection verification.
10. Production authentication/API smoke tests.
11. Production monitoring/failure-mode checks.
12. E2E RAG ingest → embed → search.
13. Agent → Brain → publish E2E.
14. Workflow approval → resume → completion.
15. Scheduled workflow over a real time boundary.
16. Newsletter delivery E2E.
17. Controlled external-provider failover test.

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

CI/CodeQL are intentionally not listed as remaining work because the latest main runs are green.

