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

Repository migration lifecycle tests identify 20261008_0012 as the current repository head. Live production migration history independently verifies 20261007_0011 on 2026-10-08; the new 0012 migration must be applied before production durability claims.

Latest main release validation is green: CI #414 and CodeQL #161 both succeeded on `6301df760774a64a7d951ae42d76b9276cf039de`.

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
- B2/S3: `S3_ENDPOINT_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`; `S3_REGION` is optional.
- Google Drive: `GOOGLE_DRIVE_CREDENTIALS_JSON`; `GOOGLE_DRIVE_EXPORT_FOLDER_ID` is optional.

Secrets are consumed only by the workflow environment and are not stored in the repository. A successful manual run is production/provider evidence; a green repository CI run is not.

## Phase 9–10 deterministic additions

The repository-side hardening suite now proves that a completed brain item cannot create duplicate posts when publish is repeated, and that chat transcript export is owner-scoped, excludes inactive sessions, and emits messages in stable chronological order. These are implementation invariants; live Agent → Brain → publish and authenticated production session verification remain separate release gates.


## Phase 9–11 hardening coverage

Publication now has a deterministic approval/content gate in addition to publish idempotency. RAG observability has a durable event table and migration; deterministic tests cover event persistence. Durable production metrics are not considered live-verified until migration 0012 is applied and production telemetry is observed.
