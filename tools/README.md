# Logixa Flow — Operations Tooling

## Purpose

Repository-side operational helpers and release-gate documentation. Production credentials must never be committed here.

## CI efficiency

GitHub Actions in `.github/workflows/ci.yml` and `.github/workflows/codeql.yml` uses per-workflow/per-ref concurrency, `cancel-in-progress: true`, documentation-only push filtering, and manual `workflow_dispatch`.

Use the GitHub Actions UI to manually dispatch a full run when a documentation-only change needs explicit validation.

## Durable workflow release gates

Do not remove the legacy scheduler/local queue until live evidence exists for: actual Render `logixa-flow-worker`; worker consumption of `logixa-workflows`; QStash signature verification; QStash to Celery delivery; real workflow completion; controlled retry; stale-claim recovery; duplicate-delivery protection; failure/recovery logs and metrics; and provider E2E for Cloudinary, Supabase Storage, B2, and Google Drive.

## Render Worker

The canonical Worker definition is `render.yaml`. Do not create a Cron Job or second Web Service as a substitute. The current Render connector does not expose a Docker Worker creation API, so actual provisioning must be performed through Render service creation/Blueprint UI using the repository `render.yaml`.

Expected command:

```text
celery -A app.workers.celery_app.celery_app worker --loglevel=INFO --concurrency=1 -Q logixa-workflows
```

## Provider E2E

Run provider tests only with real credentials supplied through the deployment environment. Never paste credentials into this repository or documentation.
