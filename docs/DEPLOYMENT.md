# Logixa Flow — Deployment

> Owner: Operations / Engineering
> Update when: deployment topology or release gates change
> Last Updated: 2026-10-08
> Do NOT put here: secret values.

## Current topology

Backend: Render Docker Web Service, Free plan, defined in render.yaml. Database: Supabase PostgreSQL + pgvector. Current workflow delivery: QStash → signed dispatch → in-process canonical workflow execution when CELERY_ENABLED=false. A Render Background Worker is not required for the current Free architecture.

Frontend Vercel configuration exists in the repository context but is subject to the operational lock; live production state must be verified before claiming deployment.

## Storage routing

Images ≤10 MB → Cloudinary. Documents ≤50 MB → Supabase Storage. Files >50 MB and ≤5 GB → Backblaze B2 through S3-compatible configuration. Export/backup artifacts → Google Drive. These are routing rules; live provider E2E remains a release gate.

## AI runtime

Render configuration selects USER_AI_ENABLED=false, ADMIN_AI_ENABLED=true, ADMIN_AI_PROVIDER=mistral, and ADMIN_AI_MODEL=mistral-small-latest. Provider support is broader than the selected provider. Implemented/configured/live-tested state must remain distinct.

## Migration state

Repository Alembic head: 20261007_0011. Live production migration head: VERIFY.

## Vercel lock

The removed web-platform/frontend/vercel.json override must not be restored or Vercel re-enabled while locked unless explicitly authorized by the project owner.

## Release gates

Latest-main CI, real provider E2E, signed QStash delivery, workflow completion/recovery, production auth/API smoke, and monitoring/failure-mode checks remain release gates.
