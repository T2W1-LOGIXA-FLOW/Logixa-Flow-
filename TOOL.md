# TOOL.md — Logixa Flow Operational Agent Guide

## Source of truth

Work directly on `main` unless the project owner explicitly authorizes another branch. Do not create feature branches for routine remediation.

Before changing infrastructure or production schema, inspect the current live state. Do not invent provider secrets, connection strings, or deployment identifiers.

## GitHub Actions efficiency

CI and CodeQL use:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

This means a newer run supersedes an older in-progress run for the same workflow/ref. Documentation-only pushes are ignored by push-based CI/CodeQL. Pull requests still validate, and `workflow_dispatch` is available for deliberate full runs.

Do not broaden `paths-ignore` to application, dependency, workflow, infrastructure, or configuration files.

## Deployment architecture

Production backend:
- Render Web Service
- Docker
- root directory: `web-platform/backend`
- health: `/health`

Durable workflow execution:
- QStash = delivery, delay, retry
- Redis = Celery broker/backend
- Celery = actual long-running execution
- PostgreSQL = durable workflow/run state

Canonical worker command:

```text
celery -A app.workers.celery_app.celery_app worker --loglevel=INFO --concurrency=1 -Q logixa-workflows
```

The repository's `render.yaml` contains the intended `type: worker` definition. Do not replace it with a Cron Job or Web Service.

## Current Render limitation

The connected Render API can list/create Web Services, Cron Jobs, and Key Value resources, but it does not expose a Background Worker creation/synchronization operation. A resource named `logixa-flow-worker` may exist while still being `type=web_service`; that does not satisfy the worker gate.

An actual Render Background Worker must be verified by its Render resource type before declaring the worker gate complete.

## Redis

Celery requires `REDIS_URL`. A Render Key Value resource `logixa-flow-redis` has been provisioned. The connected API does not expose its connection URL, so never invent one. Configure the real Render-provided internal Redis URL as `REDIS_URL` on the backend and actual Celery Worker.

## Storage routing

- Images <= 10 MB: Cloudinary
- Documents <= 50 MB: Supabase Storage
- Files > 50 MB and <= 5 GB: Backblaze B2
- Export/backup artifacts: Google Drive

The backend implementation includes provider fallbacks. Real provider E2E is separate from code verification.

## Release gates

Do not remove the legacy scheduler/local queue until all of these have live evidence:
1. Actual Render Background Worker is running.
2. Cloudinary real upload succeeds.
3. Supabase Storage real upload succeeds.
4. B2 real upload succeeds.
5. Google Drive real export succeeds.
6. QStash delivers to the backend dispatch endpoint.
7. Celery receives and executes the workflow.
8. Duplicate claim is rejected safely.
9. Failed execution retries and/or releases its claim correctly.
10. Stale worker claims are recovered after lease expiry.
11. Monitoring/log evidence is sufficient for incident investigation.

## Documentation rule

When implementation or infrastructure state changes, update:
- `README.md`
- `PROJECT_OVERVIEW.md`
- `SECURITY.md`
- `docs/DEPLOY_CHECKLIST.md`
- `docs/AI_AGENTS_SETUP.md`
- `web-platform/docs/RAG_ERROR_REPORTING.md` when RAG behavior changes

Never document a mocked or unverified provider integration as live.

## Final decision rule

Legacy scheduler/local queue removal is a post-E2E change. Keep it until the complete QStash -> Celery -> workflow path and recovery scenarios are verified in production.
