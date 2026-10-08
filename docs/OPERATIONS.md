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
