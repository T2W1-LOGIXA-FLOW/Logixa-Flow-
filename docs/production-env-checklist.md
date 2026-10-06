# Logixa Flow production environment checklist

## Backend / Render Free Web Service

Required:
- DATABASE_URL
- JWT_SECRET
- API_SECRET_TOKEN
- AGENT_SERVICE_TOKEN
- CORS_ORIGINS
- CELERY_ENABLED=false
- REDIS_URL is optional and only required if Celery execution is explicitly enabled

QStash:
- QSTASH_URL
- QSTASH_TOKEN
- QSTASH_CURRENT_SIGNING_KEY
- QSTASH_NEXT_SIGNING_KEY
- QSTASH_DESTINATION_URL

Primary storage:
- UPLOAD_STORAGE_BACKEND=cloudinary
- STORAGE_FALLBACK_BACKENDS=supabase,b2
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET

Supabase Storage fallback:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_STORAGE_BUCKET
- SUPABASE_STORAGE_PUBLIC_BASE_URL (recommended when the bucket uses a custom public URL)

B2 routing policy:
- Images <= 10 MB -> Cloudinary
- Small documents/invoices/reports <= 50 MB -> Supabase Storage
- Large datasets/attachments > 50 MB and <= 5 GB -> Backblaze B2 through the S3-compatible API
- Export reports and workflow backups -> Google Drive using user OAuth credentials

B2 fallback:
- S3_ENDPOINT_URL
- S3_ACCESS_KEY_ID
- S3_SECRET_ACCESS_KEY
- S3_BUCKET
- S3_REGION
- S3_PUBLIC_BASE_URL

Google Drive exports:
- GOOGLE_DRIVE_CREDENTIALS_JSON
- GOOGLE_DRIVE_EXPORT_FOLDER_ID (optional)

AI:
- `USER_AI_ENABLED=false` unless public AI is intentionally being exposed.
- `ADMIN_AI_ENABLED=true` for internal AI workflows.
- `NEXT_PUBLIC_USER_AI_ENABLED=false` in the frontend unless public AI is intentionally exposed.
- At least one provider key for the selected admin AI route.
- User/provider keys remain role-specific and backend-only.
- Prefer separate USER_* and ADMIN_* credentials where the provider supports it.

Payments (only after webhook fulfillment tests pass):
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_* / plan mapping values

Email:
- BREVO_API_KEY
- verified sender/domain configuration

Monitoring:
- SENTRY_DSN
- LOGFIRE_TOKEN
- AXIOM_TOKEN / AXIOM_DATASET

## Frontend / Vercel

Only public configuration belongs here:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY or publishable key
- NEXT_PUBLIC_API_URL
- NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME if direct browser delivery/configuration is needed
- NEXT_PUBLIC_TURNSTILE_SITE_KEY when Turnstile is enabled

Never put server secrets, signing keys, service-role keys, Stripe secret keys, QStash tokens, or provider private keys in NEXT_PUBLIC_* variables.

## Workflow runtime

Production Free path:
- QStash publishes to `QSTASH_DESTINATION_URL + /api/admin/workflow/qstash-dispatch`.
- The endpoint verifies `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY`.
- With `CELERY_ENABLED=false`, the request executes the canonical workflow engine in-process.
- PostgreSQL persists workflow/run state and recovery metadata.

## Operational rule

Secrets are added only after the corresponding code path has passed tests. Do not enable production payment, email, QStash, or storage failover merely by adding credentials.
