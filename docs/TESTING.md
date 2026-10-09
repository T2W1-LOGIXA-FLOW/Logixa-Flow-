# Logixa Flow — Testing

> Owner: Engineering
> Update when: test strategy, release gates, or evidence requirements change
> Last Updated: 2026-10-08
> Do NOT put here: speculative test results.

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

Repository migration lifecycle tests identify **20261008_0012** as the current repository head. Live production migration history and alembic_version independently verify **20261008_0012** on 2026-10-09.

Latest confirmed application validation is green: CI #450 and CodeQL #197 both succeeded on `115482a27a9c7d56294c8fe09940190555a8d7a1`. Later Markdown-only commits are excluded from these push workflows by design.

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
- B2/S3: `S3_ENDPOINT_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, and application-routing `S3_PUBLIC_BASE_URL`; `S3_REGION` is optional.
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
- **B2:** the owner reports `S3_PUBLIC_BASE_URL` has been added in Render. Verify the live health endpoint and run the B2 real upload/read/delete gate before treating it as complete.

## Live gate failure fixes (2026-10-09)

- Live Release Gates run #8 never reached provider code: pytest was given both a selected path and a conflicting `PYTEST_ADDOPTS` argument. The workflow now uses an explicit quoted target and defaults to the B2-only test.
- The B2 test now verifies API upload/read and HTTP read through `S3_PUBLIC_BASE_URL`, then deletes the temporary object.
- Backup/restore now automatically adds `sslmode=require` to a shared Session Pooler URL when it is absent, rejects explicitly insecure modes, and keeps `session_replication_role=replica` active in the same psql session as the data import.
- Local syntax/path checks passed. These checks do not count as live provider or restore success; rerun both manual workflows and retain their run links.
