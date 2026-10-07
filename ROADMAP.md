# Logixa Flow — Roadmap

> Owner: Project / Engineering
> Update when: a phase, release gate, deferred item, or backlog item changes status
> Last Updated: 2026-10-08
> Do NOT put here: detailed implementation instructions; use domain docs and runbooks.

## Completed Phases

### Phase 0 — Documentation audit and migration ledger
Status: VERIFIED. Evidence: 12 Markdown files were audited and ledgers A–E were built. No orphan file, plan, or decision was identified.

### Repository hardening and platform foundations
Status: DONE / VERIFIED at repository level. Repository evidence includes the canonical workflow router, Alembic chain through repository head 20261007_0011, Render Free configuration, QStash integration, storage routing, AI/RAG implementation, and CI controls. Live provider and production-path verification remains separate.

## Active Phase

### Final live-infrastructure verification

Objective: close evidence-based release gates without changing the current architecture merely to satisfy documentation.

Acceptance criteria:
- Latest-main CI is green.
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

- Final AI-agent live verification.
- Real provider credentials plus authenticated production tests where credentials/evidence are not yet available.
- Universal one-click source → publish claims until provenance, SEO, fact/source QA, human approval, and provider/storage E2E are jointly verified.

## Blocked Items

None established by repository evidence.

## Backlog — Ledger B Closure

1. Main-branch hardening toward final operational closure.
2. Latest-main CI green.
3. Real Cloudinary E2E.
4. Real Supabase Storage E2E.
5. Real Backblaze B2 E2E.
6. Real Google Drive E2E.
7. Signed QStash delivery verification.
8. QStash → workflow completion verification.
9. Workflow retry/recovery verification.
10. Duplicate-delivery protection verification.
11. Production authentication/API smoke tests.
12. Production monitoring/failure-mode checks.
13. E2E RAG ingest → embed → search.
14. Agent → Brain → publish E2E.
15. Workflow approval → resume → completion.
16. Scheduled workflow over a real time boundary.
17. Newsletter delivery E2E.
18. External-provider failover test.
19. Universal source → publish E2E.
20. Source provenance preservation to file/page/sheet/row/URL.
21. SEO/news quality validation.
22. Real production storage/provider validation before universal publishing claim.
23. Paginated chat restore.
24. Transcript export.
25. Explicit retention controls.
26. Administrator lookup.
27. Transfer confirmation.
28. Role-based transfer permissions.
29. Reviewable retention policy.
30. Approved purge workflow.
31. Session activity search.
32. Operational audit reporting for sessions.
33. Persist RAG metrics/alert history.
34. Real notification adapter.
35. Rate/window alert policies.
36. Durable alert retention/pagination/export.
37. Read-only/configuration role separation for RAG dashboard.
38. Durable quality feedback.
39. Experiment assignment/statistical analysis.
40. Cancellable async search.
41. Database index telemetry.
42. Isolated backend test database/fixtures.
43. Supported notification provider/threat model decision.
44. Durable metrics retention + deduplication.
45. Correlation-ID investigation runbook.
46. Threshold-tuning runbook.
47. Future complex AI workflows.
48. More external integrations.
49. Stronger durable job execution.
50. Expanded RAG capabilities.
51. Advanced analytics/business intelligence.
52. Broader observability/operational controls.
53. Broader supply-chain intelligence coverage.

All Ledger B items have a roadmap home; their status is determined by the sections above rather than by their presence in this closure list.
