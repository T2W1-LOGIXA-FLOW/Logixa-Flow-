# Logixa Flow — Operations

> Owner: Operations
> Update when: monitoring, recovery, or provider verification changes
> Last Updated: 2026-10-08
> Do NOT put here: secrets or unverified incident claims.

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
