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
AGENT_SERVICE_TOKEN=<same high-entropy secret configured on the Render backend and worker>
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
REDIS_URL=rediss://...
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
- Vercel public pages load: `/`, `/about`, `/contact`, `/blog`, `/agent`.
- Admin login works at `/admin/login`.
- AI chat returns a backend response, not "provider unavailable".
- Image upload returns a public B2 URL.
- No `.env`, `node_modules`, `.next`, `.venv`, local databases, or uploaded files appear in GitHub.


## Durable Workflow Services

Render web:
- `CELERY_ENABLED=true`
- `REDIS_URL` configured
- QStash token/signing keys/destination configured

Render worker:
- Create an actual Render **Worker** service from `render.yaml`.
- Command: `celery -A app.workers.celery_app.celery_app worker --loglevel=INFO --concurrency=1 -Q logixa-workflows`.
- Do not substitute a Cron Job or second Web Service.

QStash → Celery → workflow execution must be tested end-to-end before removing the legacy local scheduler/queue path.

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
