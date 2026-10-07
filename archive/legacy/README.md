<!-- Historical source archived from tools/README.md on 2026-10-08. -->

# Logixa Flow — Operations Tooling

## Purpose

Repository-side operational helpers and release-gate documentation. Production credentials must never be committed here.

## CI efficiency

GitHub Actions in `.github/workflows/ci.yml` and `.github/workflows/codeql.yml` uses per-workflow/per-ref concurrency, `cancel-in-progress: true`, documentation-only push filtering, and manual `workflow_dispatch`.

Use the GitHub Actions UI to manually dispatch a full run when a documentation-only change needs explicit validation.

## Current production workflow runtime

Render Free production uses one Web Service. Do not create or require a Render Background Worker for the current architecture.

Workflow dispatch path:

`workflow enqueue → QStash → signed /api/admin/workflow/qstash-dispatch → canonical workflow executor → PostgreSQL durable state`

`CELERY_ENABLED=false` is intentional. Celery/Redis remain supported as an optional execution mode for deployments that explicitly enable them.

## Durable workflow release gates

Do not remove the recovery/local execution path until live evidence exists for: QStash signature verification; QStash delivery to the Render dispatch endpoint; real workflow completion; controlled retry; stale-claim recovery; duplicate-delivery protection; failure/recovery logs and metrics; and provider E2E for configured Cloudinary, Supabase Storage, B2, and Google Drive integrations.

## Provider E2E

Run provider tests only with real credentials supplied through the deployment environment. Never paste credentials into this repository or documentation.

## Render Free constraint

The connected Render API exposes Web Services, Cron Jobs, and Key Value resources, but the current production plan does not include a Background Worker. Do not substitute a Cron Job or second Web Service for the workflow runtime; QStash is the durable external dispatcher.
