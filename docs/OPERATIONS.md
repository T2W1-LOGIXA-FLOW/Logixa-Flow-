# Logixa Flow — Operations

> Owner: Operations
> Update when: monitoring, recovery, or provider verification changes
> Last Updated: 2026-10-14
> Do NOT put here: secrets or unverified incident claims.

## Current status (2026-10-14)

Production RAG ingestion → Voyage embedding → retrieval/citation is verified by [run #38227390320, attempt 4](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38227390320), and authenticated Admin Brain API/UI smoke is verified by [run #38418481082](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38418481082). Durable QStash delivery/completion/idempotency, live workflow recovery, Agent → Brain → Publish, request/error telemetry and alert-path/SLO evidence, newsletter/failover, managed Auth/Storage and object-storage recovery, current-schema restore, rollback/DR, and the 24-hour scheduler boundary remain pending. The 2026-10-09 isolated public-schema restore used migration `20261008_0012`; current production migration is `20261011_0013`, so it is not current-schema restore evidence. GitHub branch search returns `main` only and no open PRs were found. Vercel remediation and paid AI fallback remain owner-approval gated.


## Principles

PostgreSQL is durable workflow/run state. Preserve the local canonical workflow recovery path until QStash and recovery are live-verified. Never infer provider health from credentials alone. Use correlation IDs and sanitized errors for RAG investigation. Keep Vercel locked when operationally disabled.

## Workflow recovery checklist

1. QStash signature validation.
2. Delivery to /api/admin/workflow/qstash-dispatch.
3. Canonical workflow execution.
4. PostgreSQL state persistence.
5. Controlled retry.
6. Stale-claim recovery.
7. Duplicate-delivery protection.
8. Failure/recovery logging and monitoring.

## RAG operations

Current reliability/quality telemetry includes correlation IDs, sanitized errors, aggregate metrics, process-local alert/feedback/A-B state where applicable, and **durable RAG observability events** in PostgreSQL via migration `20261008_0012`. Durable event storage is deployed; alert notification, retention/export, experiment statistics, and live production observation remain separate release gates.

Backlog runbooks: correlation-ID investigation; threshold tuning; durable metrics retention; notification-provider and threat-model decision.

- Scheduler guard: PR #75 is deployed (Render deploy dep-db65vj7avr4c73fn6gvg). The cooldown key was seeded from the last existing preview, and the first post-deploy startup created no new preview. Preserve pending drafts for admin review. Follow-up PR #76 calculates remaining cooldown rather than resetting a full interval on each restart; deploy it and confirm the next 24-hour cycle before closing this gate.

- RAG v2 rollout: current production is on `RAG_EMBEDDING_VERSION=2` and deployed mode `voyage_only`. The 7 indexed chunks use valid Voyage 512-D vectors; legacy vectors are intentionally absent. Do not roll back to version 1 without a deliberate migration/re-embedding plan, because v1 search skips v2-only rows.

- RAG provider/E2E gate: Production Auth Smoke run #38227390320 attempt 4 passed the non-persisting Voyage smoke (`voyage-3-lite`, 512 dimensions, `persisted=false`), synced feeds, ingested 7 sources with zero errors, and returned 5 retrieval matches with a non-empty citation. The 125 pending/private Brain records were not ingested. Preserve the admin-auth gate and keep ingestion limited to public RSS sources plus approved/published Brain records.

## Provider verification

Configured integrations are not live until real E2E evidence exists for Cloudinary, Supabase Storage, B2, Google Drive, QStash, and the selected AI path.

## Incident handling

Preserve evidence, correlation IDs, sanitized logs, affected run/session IDs, and provider response classes. Do not copy secrets into tickets or documentation.


## Production auth and backup gate runbook (2026-10-09)

- Auth smoke requires the GitHub `production` environment secrets `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `PRODUCTION_ADMIN_EMAIL`, `PRODUCTION_ADMIN_PASSWORD`, and `PRODUCTION_API_URL`. A blank secret fails preflight; it is not evidence of an application auth defect.
- Backup/restore must use Supabase shared Session Pooler URLs (host `*.pooler.supabase.com`, port `5432`, `sslmode=require`) for the IPv4-only GitHub runner. Use the production project `ephrnmigiwjhdjksreos` as source and isolated restore project `bxvykaijlrqjvlhtumpg` as target. Never point the restore URL at production.
- A successful connectivity preflight is not a successful restore. Require the workflow's post-restore table/migration checks and retain the Actions run link as evidence.
- B2 configuration is not verified by saving `S3_PUBLIC_BASE_URL` alone; require a clean live `/health` result and a successful real upload/read/delete round trip.

## Latest production gate follow-up (2026-10-09)

- Production Auth Smoke run #11 passed.
- For B2, run Live Release Gates with provider `b2`; the workflow now tests both S3 API readback and the configured public URL.
- For backup/restore, use the production Session Pooler and the dedicated isolated restore project. The workflow adds `sslmode=require` if absent and rejects an explicitly insecure SSL mode. The restore target's public schema is intentionally reset after backup and connection checks pass; never point it at production.
- Keep secrets in GitHub Environment Secrets. Share run URLs and redacted error messages, not credentials.


## Live release gate follow-up — 2026-10-09 (runs #9 / #3)

- Live Release Gates run #9 reached the real B2 test: S3 API upload and authenticated readback passed, but the public GET returned HTTP 400. This is now treated as a public URL-format/configuration issue, not as an S3 upload failure. The storage helper builds native Backblaze URLs as `/file/<bucket>/<key>` when `S3_PUBLIC_BASE_URL` is a native download host root or `/file` prefix. Custom domains are left unchanged. If the gate still fails, its error includes the HTTP status and a short response-body excerpt; inspect that sanitized response and ensure the secret is a public download URL base, not the S3 API endpoint.
- Follow-up: private-bucket support is being implemented so B2 objects are served through an opaque application URL using authenticated S3 GET. The historical public-GET failures above remain valid evidence for the old implementation, but are no longer the target behavior after this change is deployed.
- Production Backup Restore run #3 connected to both databases, created all three logical dump files, and reset only the dedicated isolated restore project's public schema. Restore then failed replaying `roles.sql` with `permission denied for parameter log_min_messages`. Supabase-managed roles/settings are platform-owned, so the workflow no longer replays the role-only dump; it restores application schema/data into the existing managed roles instead. This fix requires another isolated restore run to verify schema/data restore and post-restore assertions.
- Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37902011746 and https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37902042481.


## AI cost policy and key verification — 2026-10-09

- Application LLM generation is code-restricted to OpenRouter `openrouter/free`. Other provider credentials (Gemini, Groq, Cerebras, Mistral, Cohere, NVIDIA, OpenAI, and Hugging Face) are not used by the normal backend router/agent-writer generation path. They may remain in Render until separately reviewed; their presence is not evidence that they are active.
- A non-free OpenRouter model ID is normalized to `openrouter/free`; the backend does not fall back to other paid providers. If OpenRouter fails, the backend uses local fallback when allowed, or fails closed in production. Agent writer falls back to a local Myanmar article.
- `AI_COST_PER_1K=0` is set for the free-only path so internal estimated-cost telemetry does not falsely charge a positive model rate. This is an estimate setting, not an OpenRouter invoice or billing record.
- OpenRouter's Free plan has request limits (pricing page currently lists 50 requests/day). Free model endpoints have low rate limits; request failures/429s must not trigger paid fallback. Reference: https://openrouter.ai/pricing/ and https://openrouter.ai/support/.
- Credential values are masked by Render and must never be copied into chat/logs. Presence can be reported without exposing the secret, but validity is **PENDING** until a real authenticated request through the deployed app succeeds.
- B2 live gate run #10: S3 API upload/readback passed; public GET returned HTTP 400 with `Unable to obtain accountId for request`. The helper now converts a supplied `s3.<region>.backblazeb2.com` endpoint into the bucket-specific virtual-hosted public URL `<bucket>.s3.<region>.backblazeb2.com`; native `fNNN.backblazeb2.com` URLs retain `/file/<bucket>`. This needs a new live B2 gate to verify.
- Follow-up: the private-bucket implementation removes S3_PUBLIC_BASE_URL from required configuration and changes the live gate to authenticated S3 upload/read/delete. This is not live-verified until the code is merged/deployed and a fresh provider run passes.
- Evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37908171471/job/113746607733.


## Additional AI billing surfaces — 2026-10-09

- RAG previously used Gemini Embeddings when `GEMINI_API_KEY` existed. This path is removed. Embeddings now use only `liquid/lfm-2.5-embedding-350m:free` through OpenRouter with a 768-D compatibility request; invalid/unavailable responses fall back to local 768-D hash vectors. No Gemini embedding fallback remains.
- Hugging Face toxicity moderation is a separate inference call and could use credits. It now requires explicit `HF_MODERATION_ENABLED=true`; production Render is configured false. The key may remain stored but is not called by default.
- OpenRouter's Liquid free embedding endpoint warns that requests and embeddings may be retained for model training. Treat this as a data-sharing decision; use local hash fallback for confidential text if that retention is not acceptable.


## Backup/restore duplicate-key follow-up — 2026-10-09

- Production Backup Restore run #5 (https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37962624876) failed during data replay with a duplicate key on `users_pkey`.
- Live read-only catalog checks show `users` exists in the managed `auth` schema in both projects and does not exist in `public`. The workflow resets only `public`; it must not replay managed Auth rows into the existing isolated project's Auth schema.
- The workflow now explicitly scopes both logical dumps to `--schema public` and rejects unexpected schema-qualified Auth/Storage COPY entries. This is an application-schema restore gate; it does not claim to back up or restore Supabase-managed Auth/Storage data.
- Re-run the workflow manually and require all post-restore assertions to pass before treating this gate as verified. Production remains source-only; never use it as the restore target.


## Backup/restore gate passed — 2026-10-09

- Production Backup Restore Gate run #6 passed: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37964429760.
- The workflow created a production logical backup, restored the `public` application schema into isolated project `bxvykaijlrqjvlhtumpg`, and verified Alembic head `20261008_0012`, four critical tables, and a numeric `rag_observability_events` row count (0).
- Scope is deliberately limited to the application `public` schema. This does not verify managed Supabase Auth/Storage restoration, object-storage recovery, rollback, or post-rollback smoke checks.
\n\n## All-provider release gate reconciliation — 2026-10-09\n\n- Live Release Gates run #15 passed all four provider tests (Cloudinary, Supabase Storage, private B2/S3, Google Drive): https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37956262981. Reuse this evidence; do not ask for a provider rerun unless code changes or new failure evidence warrants it.\n- Run #16 was cancelled before test execution and adds no new evidence.\n- Supabase Storage upload/read was successful and the test sent a cleanup DELETE, but the current test does not assert the DELETE response status. Treat only the deletion-confirmation assertion as open; do not reclassify the upload/read path as untested.\n

## Release status reconciliation (2026-10-11)

- Verified: production auth/API smoke (run #11), Cloudinary/Supabase Storage/B2/Google Drive provider evidence, B2 application private-download proxy (run #38049146602), QStash US-region signature-only smoke, and isolated public-schema database restore (run #6). QStash durable workflow completion/idempotency remains pending after the historical EU-region delivery cited as successful returned HTTP 401 Invalid QStash signature.
- Pending: live workflow retry/stale-claim/failure recovery, RAG and complete AI publishing journeys, approval/resume and real scheduled-boundary verification, newsletter delivery, controlled provider failover, managed Supabase Auth/Storage recovery, object-storage DR, rollback rehearsal, authenticated Admin UI smoke (verified by run #38418481082), and measurable SLO/error-budget/alert-path evidence.
- Render's bounded event inspection did not show matching failure events, but request-count/latency telemetry was unavailable for the inspected window. Missing telemetry is not evidence of a good SLO.
- OpenRouter free-tier HTTP 429 remains a provider quota/rate-limit blocker for scheduled AI preview. Do not enable paid fallback without explicit owner approval. Vercel remediation remains paused by owner direction.

## Workflow/Agent hardening deployment (2026-10-11)

- Render deployment dep-db5ie03hu5js73drbig0 reached live for commit 4f530837fc148e44be2f6cb0ecb0a5f291278be2.
- CI #564 passed (backend 199 passed / 5 skipped; agents, frontend tests/build, dependency security passed) and CodeQL #311 passed for Python and JavaScript/TypeScript.
- Patch addresses durable workflow node-progress resume, reclaiming jobs without claimed_at, undefined sanitized objective in build_steps(), and HTML escaping in local Agent drafts.
- These are code/CI/deploy checks, not live workflow recovery or RAG/publishing proof. Keep production retry/stale-claim/failure recovery, RAG→Agent→Brain→Publish, approval/resume, and scheduled-boundary gates PENDING.
- OpenRouter free-tier HTTP 429 remains a production AI blocker; do not enable paid fallback without explicit owner approval. Vercel remediation remains paused.

## Imported draft publishing safety deployment (2026-10-11)

- Backend and CLI draft converters escape untrusted text before HTML wrapping.
- CI #569 passed (backend 200 passed / 5 skipped, agents 5 passed, frontend tests/build and dependency security passed); CodeQL #316 passed for Python and JavaScript/TypeScript.
- Render deployment dep-db5ifnprn11c73dg9ak0 reached live for code commit 8f8397f16d74281d1072ed3b8cb8bd5017a2c5c1 
- This does not close live workflow recovery, RAG ingest/search, Agent→Brain→Publish, approval/resume, or scheduled-boundary checks. OpenRouter HTTP 429 remains a provider-capacity blocker; paid fallback is not authorized. Vercel remediation remains paused.

- Production RAG rollout update (2026-10-12): full ingest→retrieval→citation E2E passed in run #38227390320 attempt 4. The HTTP 422 root cause was a 5-second search budget conflicting with 21-second Voyage pacing; PR #90 fixed safe diagnostic logging and PR #91 raised the configurable timeout budget to 75 seconds and classifies timeouts as 503. Both are merged and live. Overall release remains pending for the separate recovery, publishing, SLO, rollback/DR, newsletter, failover, and scheduler-observation gates.


## Production release-closure gates

- **Authenticated Admin UI:** run the manual GitHub Actions workflow `Production Admin UI Smoke`. It logs in using the GitHub `production` environment credentials, confirms the authenticated dashboard renders, navigates to AI Brain, and confirms the Brain page renders. It is read-only after login. Required secrets: `PRODUCTION_FRONTEND_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `PRODUCTION_ADMIN_EMAIL`, and `PRODUCTION_ADMIN_PASSWORD`. A missing secret is a configuration blocker, not a pass.
- **Synthetic health/SLO probe:** `Production SLO Synthetic Probe` runs every 15 minutes and records a timestamp, HTTP status, and request latency in a 30-day Actions artifact. Set `PRODUCTION_API_URL` and `OPS_ALERT_WEBHOOK_URL` in the `production` environment. Manually dispatch with `test_alert=true` to verify the external notification path. The probe only measures synthetic `/health`; it does not certify real user-request availability, workflow completion SLOs, or the 30-day error budget.
- **Agent → Brain → Publish:** backend integration tests exercise agent-run creation, private pending Brain state, explicit approval, publication, and soft-unpublish. This proves application-path behavior under a test database only; production business-journey evidence remains a separate release gate.
- **Rollback/DR:** follow `docs/DR_ROLLBACK.md`. No production rollback, destructive restore, or publication mutation is run automatically by these checks.
