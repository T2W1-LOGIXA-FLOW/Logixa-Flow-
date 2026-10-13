# Logixa Flow — Deployment

> Owner: Operations / Engineering
> Update when: deployment topology or release gates change
> Last Updated: 2026-10-14
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

Repository Alembic head: **20261011_0013**. Live production migration head: **20261011_0013**, verified 2026-10-11. Production RAG configuration was verified as `RAG_EMBEDDING_VERSION=2` with `rag_v2_ingestion_mode=voyage_only`; 7 valid Voyage 512-D chunks were confirmed by the production RAG E2E. The historical 2026-10-09 backup/restore drill used migration `20261008_0012` and must not be treated as current-schema restore evidence.

## Vercel lock

The removed web-platform/frontend/vercel.json override must not be restored or Vercel re-enabled while locked unless explicitly authorized by the project owner.

## Current release evidence boundary (2026-10-14)

Production RAG ingest → retrieval/citation is verified by [run #38227390320 attempt 4](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38227390320), and authenticated Admin Brain API/UI smoke by [run #38418481082](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38418481082). Durable QStash workflow completion/recovery, current-schema restore, rollback/DR, request-level SLO/alerting, newsletter delivery, provider failover, and the 24-hour scheduler observation remain pending. The current architecture and the Render Free/CELERY_ENABLED=false decision are unchanged.

## Current release evidence boundary (2026-10-14)

Production RAG ingest → retrieval/citation is verified by [run #38227390320 attempt 4](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38227390320), and authenticated Admin Brain API/UI smoke by [run #38418481082](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38418481082). Durable QStash workflow completion/recovery, current-schema restore, rollback/DR, request-level SLO/alerting, newsletter delivery, provider failover, and the 24-hour scheduler observation remain pending. The current architecture and Render Free / `CELERY_ENABLED=false` decision are unchanged.

## Release gates

Latest-main CI, real provider E2E, signed QStash delivery, workflow completion/recovery, production auth/API smoke, and monitoring/failure-mode checks remain release gates.
