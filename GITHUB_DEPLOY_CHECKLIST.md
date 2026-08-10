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
Install command: npm install
Build command: npm run build
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
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
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
UPLOAD_STORAGE_BACKEND=r2
S3_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET=...
S3_PUBLIC_BASE_URL=https://your-public-r2-domain
```

## Deployment Validation

- Backend `/health` opens and returns healthy status.
- Vercel public pages load: `/`, `/about`, `/contact`, `/blog`, `/agent`.
- Admin login works at `/admin/login`.
- AI chat returns a backend response, not "provider unavailable".
- Image upload returns a public R2 URL.
- No `.env`, `node_modules`, `.next`, `.venv`, local databases, or uploaded files appear in GitHub.
