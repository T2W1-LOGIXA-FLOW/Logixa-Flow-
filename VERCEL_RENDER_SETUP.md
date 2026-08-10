# Vercel, Render, Supabase, R2, and Upstash Setup

This guide is for the current free-tier-friendly Logixa Flow deployment.

## Architecture

```text
Users
  -> Vercel frontend (Next.js)
  -> Render backend API (FastAPI)
  -> Supabase PostgreSQL
  -> Cloudflare R2 uploads
  -> Upstash Redis cache/queue helper
```

Optional:

- `cron-job.org` can ping the Render `/health` endpoint every 10 minutes.
- Koyeb can run a separate background worker later, after a stable worker entrypoint is finalized.

## 1. Backend on Render

Preferred setup:

1. Create a Render Web Service from the GitHub repo.
2. Use root directory `web-platform/backend`.
3. Use Docker runtime.
4. Use Dockerfile path `Dockerfile` when root directory is set, or `web-platform/backend/Dockerfile` when deploying from repo root.
5. Add the environment variables below.

Required Render environment variables:

```text
DATABASE_PROFILE=supabase
DATABASE_URL=postgresql://...
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<secure-password>
JWT_SECRET=<long-random-secret>
API_SECRET_TOKEN=<long-random-token>
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

Upstash Redis:

```text
REDIS_URL=rediss://...
```

Cloudflare R2 uploads:

```text
UPLOAD_STORAGE_BACKEND=r2
S3_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET=logixa-flow-uploads
S3_PUBLIC_BASE_URL=https://your-public-r2-domain
```

Health check path:

```text
/health
```

## 2. Frontend on Vercel

Vercel project settings:

```text
Framework Preset: Next.js
Root Directory: web-platform/frontend
Install Command: npm install
Build Command: npm run build
Output Directory: .next
```

Required Vercel environment variables:

```text
NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com
NEXT_PUBLIC_SITE_URL=https://your-vercel-domain.vercel.app
```

Do not add backend secrets to Vercel:

- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `JWT_SECRET`
- `API_SECRET_TOKEN`
- AI provider API keys
- R2 secret key

## 3. Supabase PostgreSQL

Use the Supabase connection string as the backend `DATABASE_URL`.

Recommended:

- Use the pooled production connection string when available.
- Include SSL mode if Supabase provides it.
- Keep the URL only in Render, local `.env`, or a secure secret manager.

## 4. Cloudflare R2

1. Create an R2 bucket for uploads.
2. Create an R2 API token/access key with bucket read/write permissions.
3. Set `UPLOAD_STORAGE_BACKEND=r2` on Render.
4. Set the `S3_*` variables.
5. Configure a public bucket domain or custom domain and use it as `S3_PUBLIC_BASE_URL`.

The backend upload API returns public URLs from `S3_PUBLIC_BASE_URL`.

## 5. Upstash Redis

1. Create an Upstash Redis database.
2. Copy the `rediss://` URL.
3. Add it to Render as `REDIS_URL`.

Redis is optional for basic usage. The app has fallback behavior, but Redis is recommended for production-like behavior.

## 6. Keep Render Warm

Use `cron-job.org`:

```text
GET https://your-render-backend.onrender.com/health
Every 10 minutes
```

Render free services can still be slower than paid instances, but this reduces cold starts.

## 7. CORS

Use exact origins only:

```text
CORS_ORIGINS=https://logixa-flow.vercel.app,https://your-preview-domain.vercel.app
```

Do not use:

```text
CORS_ORIGINS=https://*.vercel.app
```

The backend CORS middleware expects exact origins.

## 8. Validation

After deploy:

1. Open `https://your-render-backend.onrender.com/health`.
2. Confirm `database` is healthy.
3. Confirm `upload_storage_backend` is `r2`.
4. Confirm `upload_storage_configured` is `true`.
5. Open the Vercel public site.
6. Test `/about`, `/contact`, `/blog`, and `/agent`.
7. Test `/admin/login`.
8. Upload a small image from admin and confirm the returned URL uses the R2 public domain.
