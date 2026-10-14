# Logixa Flow — Testing

> Owner: Engineering
> Update when: test strategy, release gates, or evidence requirements change
> Last Updated: 2026-10-14
> Do NOT put here: speculative test results.

## Latest verified evidence (2026-10-14)

- Main CI and CodeQL passed for the Admin Brain response-validation fix: [CI #38417257244](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38417257244), [CodeQL #38417257528](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38417257528).
- The authenticated Admin Brain API/UI smoke passed in [run #38418481082](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38418481082).
- Frontend validation for PR #114 passed: 35 test files / 83 tests and production build; [CI #38424954202](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38424954202), [CodeQL #38424954119](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38424954119). The fix was merged as `d943cb66390f324eaee39cd3bf9d0c3a993bef3c`.
- Production RAG ingestion → embedding → retrieval/citation passed in [run #38227390320, attempt 4](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38227390320).
- These results do **not** verify durable QStash workflow completion/idempotency, live retry/stale-claim recovery, Agent → Brain → Publish, SLO/alerting, newsletter/failover, current-schema restore, rollback/DR, or the 24-hour scheduler boundary. Those gates remain PENDING.

## Local regression run for QStash recovery patch (2026-10-14; GitHub CI pending)

- Backend: `236 passed, 5 skipped`; Alembic migrations applied through `20261011_0013` against an isolated SQLite test database.
- Agents: `5 passed`.
- Frontend: `35 test files passed, 83 tests passed`; `npm run build` succeeded. React `act(...)` and intentionally exercised error-path messages were logged by tests but did not fail the suite.
- Security: `pip-audit -r web-platform/backend/requirements.txt` reported no known vulnerabilities; `npm audit --omit=dev` reported 0 vulnerabilities. Full npm audit still reports 7 high development/tooling findings; major Tailwind/Next ESLint remediation remains owner-approval gated.
- Regression coverage added for QStash dispatch exceptions releasing the durable claim and returning HTTP 503, plus terminal redelivery reconciling job status without re-execution.
- These are local test results for the patch branch, not GitHub Actions or production-live evidence. PR [#115](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/pull/115) is open; its CI/CodeQL and live QStash recovery remain pending.

## Test layers

1. Repository/static checks.
2. Backend unit and integration tests.
3. Frontend build/tests.
4. API/auth smoke tests.
5. Provider E2E with real configured infrastructure.
6. Production workflow and recovery verification.

## Evidence rules

A unit test proves its tested path, not external-provider health. Configured credentials prove configuration, not reachability. Repository migration head is distinct from live production head. Implemented is distinct from enabled, and enabled is distinct from live-tested.

## Current evidence

Historical migration lifecycle evidence from 2026-10-09 identified **20261008_0012** at that time. The current repository and live production migration head is **20261011_0013**, as recorded in `CURRENT_STATE.md`.

Latest confirmed application-code validation is green: CI #535 and CodeQL #282 both succeeded on diagnostics SHA `896c3d0b1086799883b4128bb5ed3d088c5965d3` (CI: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38028420417; CodeQL: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38028420358). The deployed B2 proxy was subsequently verified by production run #38049146602 (`2 passed in 12.32s`). Later Markdown-only commits are excluded from these push workflows by design.

These results verify repository CI/security automation for that main commit; they do not substitute for production/provider E2E evidence.

## Opt-in live provider suite

Set `RUN_LIVE_E2E=1` and provide the required provider environment variables to run `web-platform/backend/tests/test_live_release_gates.py`. The suite performs real upload/read/delete round trips for Cloudinary, Supabase Storage, B2/S3-compatible storage, and Google Drive. Missing provider configuration causes that provider test to skip rather than fabricate a pass.

## Required live tests

Cloudinary; Supabase Storage; B2; Google Drive; signed QStash delivery; workflow completion; retry/recovery and duplicate-delivery protection; production authentication/API smoke; monitoring/failure-mode behavior; RAG ingest → embed → search; Agent → Brain → publish; approval → resume → completion; scheduled execution across a real time boundary; newsletter delivery; controlled provider failover.


## Deterministic release-hardening coverage

The non-live suite now covers workflow node retry recovery and retry exhaustion, stale worker-lease reclamation, terminal/duplicate QStash idempotency, approval pause/resume, idempotent RAG source re-ingestion, deterministic RAG ingest → embed → search, repeated brain publish idempotency, scheduled-delay semantics, and owner-scoped chat transcript export. These tests prove local control-flow invariants without treating them as production E2E evidence.

Live verification remains separately gated by `RUN_LIVE_E2E=1`; missing external-provider configuration must remain a skip, never a synthetic pass.


## Manual production live-release workflow

The repository now includes `.github/workflows/live-release-gates.yml`. It is a manual `workflow_dispatch` gate and never runs against production credentials on normal pushes.

Use the GitHub Actions **Live Release Gates** workflow with the `production` environment. Select `all` or one provider: Cloudinary, Supabase Storage, B2/S3, or Google Drive. The workflow performs a preflight check for the selected provider's required secrets and **fails** when they are absent; it does not convert missing configuration into a passing skip.

Required production environment secrets:
- Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Supabase Storage: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`
- B2/S3: S3_ENDPOINT_URL, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and S3_BUCKET; S3_REGION is optional. S3_PUBLIC_BASE_URL is optional and only used for public bucket/custom-domain delivery.
- Google Drive: `GOOGLE_DRIVE_CREDENTIALS_JSON`; `GOOGLE_DRIVE_EXPORT_FOLDER_ID` is optional.

Secrets are consumed only by the workflow environment and are not stored in the repository. A successful manual run is production/provider evidence; a green repository CI run is not.

## Phase 9–10 deterministic additions

The repository-side hardening suite now proves that a completed brain item cannot create duplicate posts when publish is repeated, and that chat transcript export is owner-scoped, excludes inactive sessions, and emits messages in stable chronological order. These are implementation invariants; live Agent → Brain → publish and authenticated production session verification remain separate release gates.


## Phase 9–11 hardening coverage

Publication now has a deterministic approval/content gate in addition to publish idempotency. RAG observability has a durable event table and migration; deterministic tests cover event persistence. Durable production metrics are not considered live-verified until migration 0012 is applied and production telemetry is observed.


## Failed live gate remediation (2026-10-09)

- **Production Auth Smoke:** the failed run stopped at configuration preflight because `SUPABASE_PUBLISHABLE_KEY`, `PRODUCTION_ADMIN_EMAIL`, `PRODUCTION_ADMIN_PASSWORD`, and `PRODUCTION_API_URL` were empty in the selected GitHub `production` environment. Set the environment secrets by name; do not paste their values into issues or chat. The workflow now prints missing secret names and checks that the two base URLs are HTTPS URLs.
- **Production Backup Restore:** the failed run attempted the direct `db.<project>.supabase.co:5432` endpoint and hit an IPv6-unreachable error. For this dump/restore workflow, use the shared **Session Pooler** connection strings from Supabase Dashboard → Connect → Session pooler, on port `5432`, with `sslmode=require`. Do not use the direct endpoint or the transaction pooler for `pg_dump`/restore. Production must identify project `ephrnmigiwjhdjksreos`; the isolated restore target must identify `bxvykaijlrqjvlhtumpg`. The workflow preflights both connections before running the dump.
- The workflow changes prevent known missing-secret and wrong-connection-mode failures; they do not prove that a new backup/restore succeeds. Record a fresh run URL and investigate any restore-stage schema/data conflict rather than marking the gate green by assumption.
- **B2:** keep the bucket Private; deploy the private-download proxy and run the B2 authenticated upload/read/delete gate before treating the provider as verified.

## Live gate failure fixes (2026-10-09)

- Live Release Gates run #8 never reached provider code: pytest was given both a selected path and a conflicting `PYTEST_ADDOPTS` argument. The workflow now uses an explicit quoted target and defaults to the B2-only test.
- The B2 test verifies authenticated S3 API upload/read/delete. Application download proxy behavior is covered by backend unit tests; live verification requires deploying the change and testing the returned application URL.
- Backup/restore now automatically adds `sslmode=require` to a shared Session Pooler URL when it is absent, rejects explicitly insecure modes, and keeps `session_replication_role=replica` active in the same psql session as the data import.
- Local syntax/path checks passed. These checks do not count as live provider or restore success; rerun both manual workflows and retain their run links.


## Workflow recovery and Agent draft regression evidence (2026-10-11)

The following regression cases were added:
- Recovery after restart resumes from durable completed_nodes rather than replaying completed nodes.
- A running job with a missing claimed_at can be reclaimed.
- build_steps() sanitizes the objective without raising NameError.
- Local Agent draft HTML escapes user/source-controlled values.

CI #564 passed on commit 4f530837fc148e44be2f6cb0ecb0a5f291278be2: backend 199 passed / 5 skipped; agents tests, frontend tests/build, and dependency security job passed. CodeQL #311 passed for Python and JavaScript/TypeScript. Run links: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38116906548 and https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38116906581.

The Render deploy reached live, but live workflow recovery and RAG/publishing journeys have not been run by this CI job. Keep those production gates PENDING.

## Imported draft publishing safety regression evidence (2026-10-11)

Backend and CLI Markdown-to-HTML conversion now escape untrusted text before wrapping it in HTML. Regression tests cover HTML/script-like input for both paths. CI #569 passed with backend 200 passed / 5 skipped, agents 5 passed, frontend tests/build passed, and dependency security passed. CodeQL #316 passed for Python and JavaScript/TypeScript.

Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38117114461 · https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38117114411

The production deploy reached live, but live workflow recovery and RAG/publishing journeys remain separate pending gates.