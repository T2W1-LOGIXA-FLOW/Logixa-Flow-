# Logixa Flow — Release Certification

> Owner: Engineering / Release
> Status: PENDING FINAL EVIDENCE
> Last Updated: 2026-10-11

## Certification rule

Release certification requires repository CI/security validation, live provider evidence, production workflow evidence, backup/restore evidence, rollback evidence, and documentation reconciliation. No repository test substitutes for a live production gate.

## Evidence index

- Repository code commit verified live on Render: `318114adfd60b4d0a6289f03b7bd6c1f0fe365a7` (deployment `dep-db5rei779l7c73frthcg`).
- Live production Alembic migration head: `20261011_0013` (verified by read-only Supabase catalog query on 2026-10-11).
- **Deployed application private-B2 download-proxy E2E VERIFIED on 2026-10-10**: one-time production verification run #38049146602 synced the known-good GitHub B2 settings into Render and waited for the deployment to become live. Both direct B2 round-trip and authenticated application upload → private download/readback → cleanup passed (`2 passed in 12.32s`). Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38049146602. The earlier run #19 timeout is historical and was superseded by this successful production verification. CI #535 and CodeQL #282 also passed on the diagnostics SHA; the current release remains pending on other independent gates.
- Cloudinary live E2E: VERIFIED 2026-10-08.
- QStash signed delivery/completion/duplicate protection: VERIFIED 2026-10-08.
- Supabase Storage upload/read: VERIFIED by all-provider Live Release Gates run #15 (4 passed); strict cleanup DELETE response assertion was added on 2026-10-10; the targeted live Supabase rerun passed in run #17 (`1 passed in 3.24s`), completing the upload/read/cleanup gate.
- Backblaze B2 provider-level authenticated upload/read/delete: VERIFIED by run #12; deployed application private-download proxy: VERIFIED by run #38049146602.
- Google Drive upload/read round-trip: VERIFIED by run #14 and included in all-provider run #15; broader export semantics only if directly covered by a dedicated test.
- Live workflow retry/stale-claim/failure recovery: PENDING.
- Production authentication/API smoke: VERIFIED by Production Auth Smoke run #11 on 2026-10-09; password-grant authentication, `/api/auth/me` admin-role assertion, and admin RAG metrics request passed. Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37899971474.
- Full authenticated Admin UI browser verification: PENDING. Existing checks prove login page rendering, unauthenticated protection, and API auth, but do not prove the authenticated dashboard renders and navigates correctly.
- Production RAG/AI journeys: PENDING.
- Newsletter/failover: PENDING.
- Application-schema backup/restore drill: VERIFIED on 2026-10-09 (run #6); managed Auth/Storage and object-storage recovery remain separate pending gates.
- DR/rollback rehearsal: PENDING — runbook/gate staged; live rehearsal required.
- SLO/error-budget review: PENDING; Render HTTP request-count/latency datapoints were unavailable for the inspected window. A bounded event inspection alone cannot calculate availability or an error budget. Request/error telemetry, an auditable measurement query/export, alert-path test, and required observation window are still required.
- Dependency/license/security refresh review: PENDING. Supabase Auth leaked-password protection is disabled per the last advisor review and requires dashboard-level action/owner decision.
- Newsletter delivery: PENDING; newsletter endpoints return HTTP 501 until a transactional email provider is connected.
- Vercel deployment/check remediation remains paused by owner direction; do not resume without explicit approval. This does not authorize changing Vercel build quota or deployment settings.

## Current release position

Production database migration parity is closed. Cloudinary, Supabase Storage upload/read, private B2/S3 provider round-trip, Google Drive upload/read, and QStash core evidence have live evidence (all-provider run #15: 4 tests passed). Run #16 was cancelled before tests ran and is not a failure of those gates. The Supabase cleanup assertion was verified by targeted run #17. The targeted B2 application download-proxy gate passed in production verification run #38049146602 (`2 passed in 12.32s`), including upload, private download/readback, and cleanup. Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38049146602. Render startup logs also captured an OpenRouter HTTP 429 that caused the scheduled AI preview to fail; production RAG/AI remains pending and paid-provider fallback is not authorized. All remaining PENDING items require real production/provider/operations evidence and cannot be inferred from repository tests.

See `docs/RELEASE_EVIDENCE.md` for the canonical checklist.

## Freeze gate

Do not mark the release candidate certified until every PENDING item above has direct evidence or an explicit approved exception recorded in the release decision.


## 2026-10-11 — Workflow/Agent hardening validation

- Code commit 4f530837fc148e44be2f6cb0ecb0a5f291278be2 fixes durable completed-node resume, missing-lease stale-job reclamation, undefined safe_message in build_steps(), and unsafe HTML interpolation in local Agent drafts.
- CI #564 passed: backend 199 passed / 5 skipped; agent tests, frontend tests/build, and dependency security job passed. CodeQL #311 passed for Python and JavaScript/TypeScript.
- Render deployment dep-db5ie03hu5js73drbig0 is live on that code commit.
- This is deterministic test/deployment evidence only. Live workflow retry/recovery, RAG→Agent→Brain→Publish, approval/resume, and scheduled-boundary production journeys remain PENDING. Do not certify release based on CI/deploy status alone.

Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38116906548 · https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38116906581

## 2026-10-11 — Imported draft and CLI publishing safety

- Backend imported draft conversion and the CLI publisher now escape untrusted text before wrapping it in HTML.
- CI #569 passed: backend 200 passed / 5 skipped; agents 5 passed; frontend tests/build and dependency security passed. CodeQL #316 passed for Python and JavaScript/TypeScript.
- Render deployment dep-db5ifnprn11c73dg9ak0 reached live for commit 8f8397f16d74281d1072ed3b8cb8bd5017a2c5c1 

Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38117114461 · https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38117114411

Live workflow retry/stale-claim/failure recovery and production RAG→Agent→Brain→Publish, approval/resume, and scheduled-boundary verification remain PENDING.

## 2026-10-11 — RAG fallback diagnostics and provider smoke boundary

- Code commit `4746ffc0b89aee5581e6c74308a9e1db46e7dbe0` adds safe warning logs for missing embedding credentials, request/HTTP failures, invalid provider responses, and vector-dimension mismatch; test commit `35793c2d29dbc9b1814e030cd03ebea6610a8720` asserts the diagnostic markers. These changes do not establish a successful production embedding call.
- Provider results dated 2026-10-10 were supplied by the owner without linked request logs. Treat Gemini/Groq/Mistral/Cohere/Cloudflare results as endpoint smoke notes only, not application failover evidence. OpenRouter 429/empty response and Cerebras/Hugging Face 402 remain reported blockers.
- The configured embedding shape remains 768. Switching to Voyage 512-D or Cloudflare BGE-M3 1024-D requires a versioned data/index migration and full re-embedding/backfill; this has not been performed. No dimension truncation is approved.
- Production RAG ingest→search, AI provider failover, and RAG→Agent→Brain→approval→publish remain PENDING. Release certification remains PENDING.


## 2026-10-11 — Versioned RAG dimension remediation

- Added an additive 512-D Voyage embedding path in migration `20261011_0013`, leaving the legacy 768-D vector column intact for rollback. Added strict dimension validation, model-scoped v2 retrieval, dual-write support behind `RAG_EMBEDDING_VERSION=2`, and a resumable backfill command.
- The code/migration being committed does not mean production migration, re-embedding, or RAG E2E is complete. Keep the feature flag at `1` until production migration, zero-pending backfill, same-model retrieval, and live ingest/search checks are evidenced.
- Cloudflare BGE-M3 is 1,024-D in the owner-supplied report and cannot be used as an automatic Voyage fallback. Provider endpoint smoke tests are not production failover proof.
- Release certification remains PENDING.


## 2026-10-11 — Voyage migration deployed; release still pending

- CI #586 passed on 5a359f79f831ca8f0e925d7e1818f67c89659cf1: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38136913611.
- Render deployment dep-db5nf395efls73aqkdi0 reached live; startup logs show Alembic running 20261008_0012 → 20261011_0013 before application startup.
- SQLAlchemy emitted warnings about not recognizing existing pgvector column types during schema inspection. This requires follow-up, although the service started successfully.
- Migration deployment is not backfill completion. No evidence yet shows zero pending Voyage rows or successful production RAG ingest→search. Keep RAG_EMBEDDING_VERSION=1.
- Runtime routing audit found that only OpenRouter Free and local fallback are wired into the current LLMRouter; the other vendor adapters/keys are not currently an automatic runtime failover chain. Production local fallback defaults off, so OpenRouter HTTP 429 can still break generation.
- Certification remains PENDING.


## Production verification addendum (2026-10-11)

- Latest Render deployment `dep-db5rei779l7c73frthcg` is live; application startup completed. The latest production database reports Alembic revision `20261011_0013`, and the Voyage v2 columns/index are present.
- Production RAG readiness is **not certified**: `document_embeddings=0` and `intelligence_sources=0`, while `ai_memory_brain=122`. The v2 backfill has zero rows to process because no chunks are indexed; ingestion and ingest→search/citation E2E still need to run through the authenticated application route.
- Render logs show OpenRouter HTTP 429 and a failed scheduled daily preview. Do not certify AI availability or enable paid failover without approval. `/health` was not independently confirmed by an HTTP response in this pass. Release remains PENDING.


## Next RAG execution gate (2026-10-11)

- Read-only production query confirms all 122 `ai_memory_brain` rows have at least one usable text field, while `document_embeddings=0` and `intelligence_sources=0`. The existing admin endpoint `POST /api/admin/rag/ingest/sources` calls the repository ingestion routine for both intelligence sources and Brain memories.
- Do not ingest the 122 rows while `RAG_EMBEDDING_VERSION=1` if OpenRouter continues to return HTTP 429: the current legacy embedding adapter falls back to deterministic hash vectors, which are not semantic embeddings and would create misleading search results.
- Safe order: (1) verify Voyage credentials/provider access from the deployed runtime without exposing secrets, (2) enable v2 only after owner-controlled config change, (3) invoke the authenticated ingestion endpoint, (4) verify stored v2 vectors/model/dimensions and counts, (5) run authenticated query→retrieval→citation E2E, and (6) retain v1 rollback until evidence passes.
- This execution is blocked on authorized access to the authenticated admin/agent-service route and a verified provider call. No production rows were inserted or altered in this pass. Release certification remains PENDING.
