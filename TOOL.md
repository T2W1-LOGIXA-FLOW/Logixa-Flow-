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
- Free plan
- Docker
- root directory: `web-platform/backend`
- health: `/health`

Durable workflow execution:
- QStash = delivery, delay, retry, deduplication
- PostgreSQL = durable workflow/run state
- Render Web Service = signed QStash receiver and canonical in-process workflow execution when `CELERY_ENABLED=false`
- Celery + Redis = optional execution mode only when explicitly enabled

The current production architecture intentionally has no Render Background Worker.

## Redis

Redis is not required by the current Render Free workflow path because `CELERY_ENABLED=false`. Do not invent or configure a Redis URL solely to satisfy an obsolete worker requirement.

## Storage routing

- Images <= 10 MB: Cloudinary
- Documents <= 50 MB: Supabase Storage
- Files > 50 MB and <= 5 GB: Backblaze B2
- Export/backup artifacts: Google Drive

The backend implementation includes provider fallbacks. Real provider E2E is separate from code verification.

## Release gates

Do not remove the local recovery path until all of these have live evidence:
1. QStash signed delivery reaches the production dispatch endpoint.
2. A workflow completes through the canonical executor.
3. Duplicate delivery is safely deduplicated/claimed.
4. Failed execution retries or releases its claim correctly.
5. Stale workflow claims are recovered after lease expiry.
6. Monitoring/log evidence is sufficient for incident investigation.
7. Configured storage providers and Google Drive export pass real E2E.
8. Production authentication/API smoke tests pass.

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

Keep the PostgreSQL-backed recovery path and QStash dispatch until the complete signed QStash → workflow execution and recovery scenarios are verified in production.