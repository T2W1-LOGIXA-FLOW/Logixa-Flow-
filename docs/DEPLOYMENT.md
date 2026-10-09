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

Cost policy (2026-10-09): all application LLM generation is restricted in code to OpenRouter's `openrouter/free` router. The backend router no longer falls back to Gemini, Groq, Cerebras, Mistral, Cohere, or NVIDIA; the agent writer uses OpenRouter free only and otherwise falls back locally. The OpenRouter provider normalizes any non-free model ID to `openrouter/free`. Render is configured with USER_AI_PROVIDER/ADMIN_AI_PROVIDER=`openrouter`, USER_AI_MODEL/ADMIN_AI_MODEL=`openrouter/free`, and AI_COST_PER_1K=`0`. Legacy non-OpenRouter environment keys may still exist in Render, but are not used by the normal LLM generation path. Do not infer that the OpenRouter credential is valid merely because it is present; a real request smoke test is still required.

Use `openrouter/free` for general chat/content generation. The user-supplied list contains specialist endpoints (embedding, reranking, content-safety, and structured decision models) that are not interchangeable with the standard chat-completions API. The free router chooses from available free models automatically. Free-model requests have provider rate limits; free tier currently documents a 50-request/day cap. No paid-provider failover is permitted.

## Migration state

Repository Alembic head: **20261008_0012**. Live production migration head: **20261008_0012**, verified 2026-10-08.

## Vercel lock

The removed web-platform/frontend/vercel.json override must not be restored or Vercel re-enabled while locked unless explicitly authorized by the project owner.

## Release gates

Latest-main CI, real provider E2E, signed QStash delivery, workflow completion/recovery, production auth/API smoke, and monitoring/failure-mode checks remain release gates.
