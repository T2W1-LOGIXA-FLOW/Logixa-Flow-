# Logixa Flow Split Deployment Setup

This is the current target setup:

```text
Vercel        -> Frontend public site
Render        -> FastAPI backend API
Render Worker -> Background AI/agent pipeline
Supabase      -> PostgreSQL database
Upstash       -> Redis cache/queue URL
Backblaze B2  -> Object storage, replacing MinIO
cron-job.org  -> Keep Render backend warm
```

Render is still used, but only for the backend API and the background worker.
Database, Redis, and object storage are split out to managed services.

## 1. Supabase Database

Create or keep the Supabase PostgreSQL database, then copy the production
connection string into the Render backend:

```text
DATABASE_PROFILE=supabase
DATABASE_URL=postgresql://...
```

Use the pooled connection string when Supabase provides one. Keep the database
URL out of GitHub and Vercel.

## 2. Backblaze B2 Storage

Create a Backblaze B2 bucket for uploaded files and generate an S3-compatible
application key.

Render backend variables:

```text
UPLOAD_STORAGE_BACKEND=b2
S3_ENDPOINT_URL=https://s3.<region>.backblazeb2.com
S3_ACCESS_KEY_ID=<backblaze-key-id>
S3_SECRET_ACCESS_KEY=<backblaze-application-key>
S3_BUCKET=<bucket-name>
S3_REGION=<bucket-region>
S3_PUBLIC_BASE_URL=https://<public-bucket-or-custom-domain>
```

Example regions look like `us-west-004` or another region shown in Backblaze.
Use the exact endpoint and region from your B2 bucket page.

## 3. Upstash Redis

Create an Upstash Redis database and copy the TLS URL:

```text
REDIS_URL=rediss://...
```

Add it to the Render backend. Add the same value to the Render worker only if
you later run queue-based jobs directly from the worker.

## 4. Render Backend API

Create a Render Web Service from the GitHub repo.

Recommended settings:

```text
Runtime: Docker
Branch: main
Root Directory: web-platform/backend
Dockerfile Path: Dockerfile
Health Check Path: /health
Auto-Deploy: On Commit
```

Required backend variables:

```text
ENVIRONMENT=production
DATABASE_PROFILE=supabase
DATABASE_URL=postgresql://...
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<secure-admin-password>
JWT_SECRET=<long-random-secret>
JWT_ADMIN_SECRET=<long-random-secret>
API_SECRET_TOKEN=<long-random-token>
CORS_ORIGINS=https://logixa-flow.vercel.app,https://your-preview-domain.vercel.app
REDIS_URL=rediss://...
```

AI variables:

```text
LLM_PROVIDER=gemini
GEMINI_API_KEY=<gemini-key>
OPENROUTER_API_KEY=<openrouter-key>
GROQ_API_KEY=<groq-key>
HUGGINGFACE_API_KEY=<huggingface-key>
REQUIRE_AI_KEY=false
STRICT_LLM_ERRORS=false
```

Storage variables:

```text
UPLOAD_STORAGE_BACKEND=b2
S3_ENDPOINT_URL=https://s3.<region>.backblazeb2.com
S3_ACCESS_KEY_ID=<backblaze-key-id>
S3_SECRET_ACCESS_KEY=<backblaze-application-key>
S3_BUCKET=<bucket-name>
S3_REGION=<bucket-region>
S3_PUBLIC_BASE_URL=https://<public-bucket-or-custom-domain>
```

## 5. Vercel Frontend

Vercel project settings:

```text
Framework Preset: Next.js
Root Directory: web-platform/frontend
Install Command: npm install
Build Command: npm run build
Output Directory: .next
```

Required Vercel variables:

```text
NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com
NEXT_PUBLIC_SITE_URL=https://logixa-flow.vercel.app
```

Do not add backend secrets to Vercel:

```text
DATABASE_URL
ADMIN_PASSWORD
JWT_SECRET
JWT_ADMIN_SECRET
API_SECRET_TOKEN
GEMINI_API_KEY
OPENROUTER_API_KEY
GROQ_API_KEY
HUGGINGFACE_API_KEY
S3_SECRET_ACCESS_KEY
```

## 6. Render Worker

The worker uses `agents/Dockerfile` and runs `python worker_loop.py`.

Recommended settings:

```text
Service Type: Background Worker
Runtime: Docker
Branch: main
Docker Build Context Directory: .
Dockerfile Path: agents/Dockerfile
Docker Command: leave blank, or use python worker_loop.py
```

Worker variables:

```text
BACKEND_URL=https://your-render-backend.onrender.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<same-admin-password-as-backend>
LLM_PROVIDER=gemini
GEMINI_API_KEY=<gemini-key>
OPENROUTER_API_KEY=<openrouter-key>
GROQ_API_KEY=<groq-key>
HUGGINGFACE_API_KEY=<huggingface-key>
PIPELINE_BATCH_LIMIT=3
AUTO_APPROVE_PUBLISH=false
WORKER_MODE=web-pipeline
WORKER_INTERVAL_SECONDS=3600
WORKER_RUN_ON_START=true
WORKER_ONCE=false
```

Note: Render background workers may require a paid instance type depending on
the current Render plan. If the worker cannot run on your plan, keep the backend
deployed first and run the agent manually from admin until you upgrade or move
the worker to another host.

## 7. Keep Render Warm

Create a cron-job.org job:

```text
Method: GET
URL: https://your-render-backend.onrender.com/health
Schedule: every 10 minutes
```

This reduces Render free-tier cold starts, but it does not make free instances
equivalent to paid always-on infrastructure.

## 8. Validation

After deploy:

1. Open `https://your-render-backend.onrender.com/health`.
2. Confirm database status is healthy.
3. Confirm upload storage is configured.
4. Open `https://logixa-flow.vercel.app`.
5. Test `/about`, `/contact`, `/blog`, and `/agent`.
6. Test `/admin/login`.
7. Test admin system status and confirm AI provider keys are ready.
8. Upload a small image from admin and confirm the URL uses Backblaze B2 or the public custom storage domain.
9. Confirm cron-job.org shows successful `/health` checks.
10. Confirm worker logs show repeated `web-pipeline` runs.
