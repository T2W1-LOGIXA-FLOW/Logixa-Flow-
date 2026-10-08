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

## Required live tests

Cloudinary; Supabase Storage; B2; Google Drive; signed QStash delivery; workflow completion; retry/recovery and duplicate-delivery protection; production authentication/API smoke; monitoring/failure-mode behavior; RAG ingest → embed → search; Agent → Brain → publish; approval → resume → completion; scheduled execution across a real time boundary; newsletter delivery; controlled provider failover.
