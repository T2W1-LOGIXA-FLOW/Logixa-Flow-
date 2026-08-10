# Logixa Flow

Logixa Flow is a supply-chain intelligence platform for Myanmar-ready SCM insights, AI-assisted drafting, admin review, and public publishing.

## Project Structure

- `web-platform/frontend`: Next.js public site and admin UI
- `web-platform/backend`: FastAPI API, auth, CMS, uploads, AI endpoints
- `agents`: optional background AI/content workflows
- `render.yaml`: Render backend blueprint

## Local Preview

Backend:

```powershell
cd web-platform\backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd web-platform\frontend
npm install
npm run dev -- -p 3000
```

Open:

- Site: `http://localhost:3000`
- API docs: `http://127.0.0.1:8000/docs`
- Health: `http://127.0.0.1:8000/health`

## Deployment Shape

- Frontend: Vercel, root directory `web-platform/frontend`
- Backend API: Render web service, root directory `web-platform/backend`
- Database: Supabase PostgreSQL
- Upload storage: Cloudflare R2 or another S3-compatible bucket
- Cache/queue helper: Upstash Redis
- Optional uptime ping: cron-job.org calling `/health`

Vercel only needs public frontend variables:

```text
NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com
NEXT_PUBLIC_SITE_URL=https://your-vercel-domain.vercel.app
```

Do not put `DATABASE_URL`, AI provider keys, admin passwords, or JWT secrets in Vercel unless a specific frontend server route requires them.

Render backend variables normally include:

```text
DATABASE_PROFILE=supabase
DATABASE_URL=postgresql://...
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
JWT_SECRET=...
API_SECRET_TOKEN=...
ENVIRONMENT=production
CORS_ORIGINS=https://your-vercel-domain.vercel.app
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...
GROQ_API_KEY=...
HUGGINGFACE_API_KEY=...
REDIS_URL=rediss://...
UPLOAD_STORAGE_BACKEND=r2
S3_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET=...
S3_PUBLIC_BASE_URL=https://your-public-r2-domain
```

## Checks

Frontend:

```powershell
cd web-platform\frontend
npm run build
```

Backend:

```powershell
cd web-platform\backend
python -m pytest -q
```

Repo hygiene:

```powershell
git diff --check
git status --short
```

## Security Notes

- Never commit real `.env` files, API keys, database URLs, JWT secrets, or admin passwords.
- Keep only `.env.example` files in the repo.
- `node_modules`, `.next`, `.venv`, SQLite databases, uploads, caches, and logs are local/generated files.
- CORS origins must be exact frontend origins. Do not use `https://*.vercel.app`; the backend framework expects exact origins.
