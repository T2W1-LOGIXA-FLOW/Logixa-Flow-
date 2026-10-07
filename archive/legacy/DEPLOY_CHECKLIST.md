<!-- Archived from docs/DEPLOY_CHECKLIST.md during the 2026-10-08 documentation migration. -->

# GitHub and Deploy Checklist

## Before Commit

Run:

```powershell
git status --short
```

These files and folders must not be committed:

- `.env`
- `web-platform/backend/.env`
- `web-platform/frontend/.env.local`
- `node_modules/`
- `.next/`
- `.venv/`
- `__pycache__/`
- `.pytest_cache/`
- `*.db`
- `logs/`
- `uploads/`

They are covered by `.gitignore`. Do not use `git add -f` on secrets or generated files.

## Secret Check

Before pushing, search for accidental secrets:

```powershell
git ls-files | ForEach-Object {
  Select-String -Path $_ -Pattern "AIza|sk-or-v1|gsk_|hf_[A-Za-z0-9]" -CaseSensitive -List -ErrorAction SilentlyContinue
}
```

If any real key appears, remove it, rotate the leaked key, and commit the cleanup before deploying again.

## Commit and Push

```powershell
git add .
git status --short
git commit -m "Prepare Logixa Flow deployment"
git push origin main
```

## Vercel Frontend

Settings:

```text
Framework: Next.js
Root directory: web-platform/frontend
Install command: npm ci
Build command: npm run build

Do not create or restore `web-platform/frontend/vercel.json`. Vercel-specific overrides are intentionally removed.
```

Required variables:

```text
NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com
NEXT_PUBLIC_SITE_URL=https://your-vercel-domain.vercel.app
```

Do not add backend secrets to Vercel.

## Render Backend

Settings:

```text
Root directory: web-platform/backend
Runtime: Docker
Health check path: /health
```

Required variables:

```text
DATABASE_PROFILE=supabase
DATABASE_URL=postgresql://...
AGENT_SERVICE_TOKEN=<high-entropy secret configured on the Render backend>
JWT_SECRET=...
API_SECRET_TOKEN=...
ENVIRONMENT=production
CORS_ORIGINS=https://your-vercel-domain.vercel.app
```

AI variables:

```text
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...
GROQ_API_KEY=...
HUGGINGFACE_API_KEY=...
LLM_PROVIDER=gemini
REQUIRE_AI_KEY=false
```

Storage and cache:

```text
REDIS_URL=rediss://...  # optional unless CELERY_ENABLED=true
UPLOAD_STORAGE_BACKEND=cloudinary
STORAGE_FALLBACK_BACKENDS=supabase,b2
S3_ENDPOINT_URL=https://s3.<B2-region>.backblazeb2.com
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET=...
S3_PUBLIC_BASE_URL=https://your-public-b2-domain
```

## Deployment Validation

- Backend `/health` opens and returns healthy status.
- Vercel public pages load: `/`, `/about`, `/contact`, `/blog`.
- `/agent` is intentionally hidden/disabled when `NEXT_PUBLIC_USER_AI_ENABLED=false`; backend `/api/chat/public-query` must return 403 while `USER_AI_ENABLED=false`.
- Admin login works at `/admin/login`.
- Admin AI chat/agent routes work when `ADMIN_AI_ENABLED=true`; public AI is only tested as enabled when the feature gate is explicitly turned on.
- Image upload returns a public B2 URL.
- No `.env`, `node_modules`, `.next`, `.venv`, local databases, or uploaded files appear in GitHub.


Live Render check: the production workspace uses the single Free Web Service. No Background Worker is required for the current architecture.

## Durable Workflow Services

Render web:
- `CELERY_ENABLED=false`
- QStash token/signing keys/destination configured
- `QSTASH_DESTINATION_URL` points to the Render service base URL
- QStash delivery is verified by `/api/admin/workflow/qstash-dispatch`

Workflow E2E must verify QStash → signed dispatch → canonical workflow execution → PostgreSQL state persistence before the recovery path is changed.

## Storage Validation

Validate the policy boundaries with real provider credentials:
- image ≤10 MB → Cloudinary
- document ≤50 MB → Supabase Storage
- file >50 MB and ≤5 GB → Backblaze B2
- export/backup artifact → Google Drive

## Vercel Operational Rule

If Vercel is disabled, keep it disabled until explicit project-owner authorization. The repository intentionally contains no Vercel build/install/output override file.

## GitHub Actions efficiency

The repository intentionally prevents redundant Actions work:
- CI and CodeQL use `concurrency.cancel-in-progress: true` per workflow/ref.
- A newer main commit supersedes an older in-progress run instead of allowing both to consume runner time.
- Documentation-only push commits are ignored by CI and CodeQL.
- Pull requests remain validated.
- `workflow_dispatch` is available for an intentional full run after documentation-only changes or before a release.

Do not add `paths-ignore` to application/config/dependency/infrastructure paths. Only documentation-only changes are excluded.


## AI feature-gate validation

- `USER_AI_ENABLED=false` is the production default.
- `ADMIN_AI_ENABLED=true` keeps internal AI workflows available.
- `NEXT_PUBLIC_USER_AI_ENABLED=false` hides public AI navigation and the public agent UI.
- Backend 403 enforcement is required even if the frontend hides the feature.
- Re-enabling public AI requires both the backend gate and frontend public env to be changed deliberately.

## Source-to-content release gate

The repository contains source ingestion, CSV/XLSX/PDF import, RAG, agent generation, drafts, review, and publishing primitives. A release should not claim universal one-click source-to-publish E2E until real storage/provider tests, provenance checks, SEO packaging, fact/source QA, and human approval have all been exercised in production-like conditions.
