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

Repository migration lifecycle tests identify 20261007_0011 as the current repository head. Live production migration history independently verifies 20261007_0011 on 2026-10-08.

Latest main release validation is green:
- CI run #397 succeeded on commit `c26a8bc3` on 2026-10-07.
- CodeQL run #144 succeeded on the same commit.

These results verify repository CI/security automation for that main commit; they do not substitute for production/provider E2E evidence.

## Opt-in live provider suite

Set `RUN_LIVE_E2E=1` and provide the required provider environment variables to run `web-platform/backend/tests/test_live_release_gates.py`. The suite performs real upload/read/delete round trips for Cloudinary, Supabase Storage, B2/S3-compatible storage, and Google Drive. Missing provider configuration causes that provider test to skip rather than fabricate a pass.

## Required live tests

Cloudinary; Supabase Storage; B2; Google Drive; signed QStash delivery; workflow completion; retry/recovery and duplicate-delivery protection; production authentication/API smoke; monitoring/failure-mode behavior; RAG ingest → embed → search; Agent → Brain → publish; approval → resume → completion; scheduled execution across a real time boundary; newsletter delivery; controlled provider failover.
