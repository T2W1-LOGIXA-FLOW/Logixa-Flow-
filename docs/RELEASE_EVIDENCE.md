# Logixa Flow — Release Evidence Index

> Owner: Engineering / Release
> Status: PRE-STAGED
> Last Updated: 2026-10-08

This is the canonical evidence checklist for the Phase 7–13 release candidate. Evidence must identify the exact SHA, environment, timestamp, and observed durable outcome where applicable.

## Repository
- [ ] Release SHA fixed.
- [x] Repository CI green on current hardening SHA `115482a27a9c7d56294c8fe09940190555a8d7a1` (CI #450).
- [x] CodeQL/security checks green on current hardening SHA `115482a27a9c7d56294c8fe09940190555a8d7a1` (CodeQL #197).
- [ ] Dependency/license/security refresh reviewed.
- [x] Repository migration head equals intended release migration head: `20261008_0012`.

## Production database
- [x] Supabase migration 20261008_0012_rag_observability applied on 2026-10-08.
- [x] Production migration history independently re-read after apply; latest is 20261008093108 / 20261008_0012_rag_observability.
- [x] Production RLS/privilege check: RLS enabled; service_role SELECT allowed; anon/authenticated SELECT denied.
- [x] Supabase security/performance advisors reviewed 2026-10-08. Existing RLS-without-policy INFO findings are consistent with service-role-only internal tables; 96 unused-index INFO findings require workload-based review. One WARN remains: Auth leaked-password protection is disabled and requires dashboard-level action.

## Provider gates
- [x] Cloudinary upload/read/delete live evidence.
- [ ] Supabase Storage upload/read/delete evidence.
- [ ] Backblaze B2 upload/read/delete evidence.
- [ ] Google Drive upload/read/delete/export evidence.

## Workflow and AI/RAG
- [x] QStash signed delivery and durable workflow completion.
- [x] Duplicate QStash delivery does not re-execute a terminal run.
- [ ] Live retry/recovery evidence.
- [ ] Live stale-claim reclamation evidence.
- [ ] Controlled live failure/recovery evidence.
- [ ] Production authenticated/API smoke evidence.
- [ ] RAG ingest → embed → search production evidence.
- [ ] Agent → Brain → publish production evidence.
- [ ] Approval → resume → completion production evidence.
- [ ] Scheduled workflow crosses a real time boundary.
- [ ] Newsletter delivery evidence.
- [ ] Controlled provider failover evidence.

## Recovery
- [ ] Production logical backup workflow staged; live backup/restore run still required.
- [ ] Isolated restore completed and integrity checks passed. Workflow is staged; live run remains required.
- [ ] Object-storage recovery checked.
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
