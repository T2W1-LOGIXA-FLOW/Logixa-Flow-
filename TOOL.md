# TOOL.md — Logixa Flow Operations Runbook

## Source of truth

- Repository: `T2W1-LOGIXA-FLOW/Logixa-Flow-`
- Production backend: Render
- Database: Supabase PostgreSQL
- Durable delivery: QStash
- Long-running execution: Celery + Redis
- Storage routing: Cloudinary → Supabase Storage → Backblaze B2
- Export/backup artifacts: Google Drive

## GitHub Actions queue policy

CI and CodeQL use workflow/ref concurrency with `cancel-in-progress: true`.

A newer commit therefore supersedes an older in-progress run for the same workflow/ref. Documentation-only pushes are excluded from push-triggered CI/CodeQL, while pull requests and manual `workflow_dispatch` remain available.

Do not add broad `paths-ignore` rules to application, dependency, infrastructure, workflow, or configuration files.

## Render Worker

The repository contains an intended Render Worker in `render.yaml`:

```text
name: logixa-flow-worker
runtime: docker
dockerfile: ./web-platform/backend/Dockerfile
dockerContext: ./web-platform/backend
command: celery -A app.workers.celery_app.celery_app worker --loglevel=INFO --concurrency=1 -Q logixa-workflows
```

Current live Render verification found a service named `logixa-flow-worker`, but Render currently reports its type as `web_service`, not `worker`. Its first deployment failed because that service was created with repository root `.`, while the Dockerfile is under `web-platform/backend`.

Do not treat that service as the final Celery Worker. Do not substitute a Cron Job or public Web Service for the worker.

The correct production action is to provision/sync the `type: worker` entry from `render.yaml` in Render so the service has the worker type and the Docker context/path above.

## Storage routing

Policy:

- Image / thumbnail / icon ≤ 10 MB → Cloudinary.
- Small document / invoice / report ≤ 50 MB → Supabase Storage.
- Large dataset / attachment > 50 MB and ≤ 5 GB → Backblaze B2.
- > 5 GB → reject.
- Provider fallback follows the configured storage class policy.
- Google Drive is used for export/backup artifacts.

Real provider E2E is not complete until an authenticated upload/export has succeeded against each configured provider.

## Durable workflow

Expected chain:

`WorkflowRun → QStash signed dispatch → Celery Redis queue → atomic DB claim → workflow execution`

Operational requirements:

- Celery task retry/backoff is enabled.
- Worker-owned failed claims are released.
- Stale running claims can be reclaimed after `WORKFLOW_CLAIM_LEASE_SECONDS`.
- Duplicate execution must still be prevented by the DB claim.
- Legacy scheduler/local queue must not be removed until live QStash → Celery → workflow E2E and failure/recovery tests pass.

## Alembic

Production database revision currently documented and code-tested as:

`20261005_0010`

Migration source is under:

`web-platform/backend/migrations/versions/`

Never downgrade production to remove a migration. Use forward corrective migrations.

## Release gates

A release is not fully closed until:

1. Latest main CI and CodeQL are green.
2. Cloudinary real E2E passes.
3. Supabase Storage real E2E passes.
4. Backblaze B2 real E2E passes.
5. Google Drive real export E2E passes.
6. Actual Render Worker is provisioned and healthy.
7. QStash → Celery → workflow real E2E passes.
8. Retry, crash recovery, stale-claim recovery, duplicate-claim prevention, and monitoring are verified.
9. Legacy scheduler/local queue is reviewed and removed only if all preceding gates pass.

## Operator boundary

The repository/tooling can modify code, workflows, documentation, Render environment variables, deploys, and inspect Render/GitHub state when the connected APIs expose the required operation.

Manual user action is required when the provider UI/API operation is not exposed by the connected tool, especially Render service-type conversion/Blueprint synchronization and provider credentials that must remain secret.

Never invent or print provider secrets.
