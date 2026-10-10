# Logixa Flow — Release Evidence Index

> Owner: Engineering / Release
> Status: PRE-STAGED
> Last Updated: 2026-10-10

This is the canonical evidence checklist for the Phase 7–13 release candidate. Evidence must identify the exact SHA, environment, timestamp, and observed durable outcome where applicable.

## Repository
- [ ] Vercel integration check is green on the current main head. The latest main integration check is failing due to the Vercel Hobby build-rate limit; the last READY production deployment remains healthy, but this does not count as a green check on the current head.
- [ ] Release SHA fixed.
- [x] Latest merged application-code SHA `896c3d0b1086799883b4128bb5ed3d088c5965d3` passed CI #535 and CodeQL #282 (CI: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38028420417; CodeQL: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38028420358). Render deploy `dep-db4t0iavcj2c73e3snu0` was confirmed live for this SHA. The subsequent one-time B2 verification synced the known-good B2 settings into Render and completed successfully: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38049146602.
- [x] Repository/infrastructure audit completed 2026-10-09; findings are recorded in `docs/REPO_INFRA_AUDIT.md`.
- [x] Repository CI green for the Supabase cleanup-assertion code change at `b0af10c9208a10c4de794a0ee41d6a82b896d22e` (CI #514; backend 187 passed / 4 skipped; agents, frontend, and security jobs passed).
- [x] CodeQL/security checks green for the same code change (CodeQL #261; Python and JavaScript/TypeScript analyses passed).
- [ ] Dependency/license/security refresh reviewed.
- [x] Repository migration head equals intended release migration head: `20261008_0012`.

## Production database
- [x] Supabase migration 20261008_0012_rag_observability applied on 2026-10-08.
- [x] Production migration history independently re-read after apply; latest is 20261008093108 / 20261008_0012_rag_observability.
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
- [x] QStash signed delivery and durable workflow completion.
- [x] Duplicate QStash delivery does not re-execute a terminal run.
- [ ] Live retry/recovery evidence.
- [ ] Live stale-claim reclamation evidence.
- [ ] Controlled live failure/recovery evidence.
- [x] Production Auth Smoke run #11 passed on 2026-10-09: password-grant authentication, `/api/auth/me` admin-role assertion, and admin RAG metrics request succeeded. Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37899971474.
- [ ] RAG ingest → embed → search production evidence.
- [ ] Agent → Brain → publish production evidence.
- [ ] Approval → resume → completion production evidence.
- [ ] Scheduled workflow crosses a real time boundary.
- [ ] Newsletter delivery evidence.
- [ ] Controlled provider failover evidence.

## Recovery
- [x] Production logical backup/restore passed on 2026-10-09. Run #6 restored application `public` schema into isolated project and passed Alembic head `20261008_0012`, critical tables 4/4, and numeric RAG observability row-count assertion (0 rows): https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37964429760. This gate intentionally excludes Supabase-managed Auth/Storage schemas.
- [x] Isolated application-schema restore and integrity assertions passed after run #5's duplicate `users_pkey` failure; fix scopes schema and data dumps to `--schema public`. Historical failure: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37962624876.
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


## Production observations (2026-10-10)
- Production verification run #38049146602 confirms the deployed application proxy path is now passing. The earlier empty-log observation predates the successful gate and is retained only as historical context.
- Startup logs recorded `openrouter-free` HTTP 429 and a failed scheduled daily preview. This is a separate AI provider rate-limit/quota issue; the production router intentionally avoids paid-provider fallback. Keep RAG/AI E2E pending until provider capacity/retry behavior is verified under the intended cost policy.
