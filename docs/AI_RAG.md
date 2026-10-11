# Logixa Flow — AI and RAG

> Owner: AI / Backend
> Update when: provider routing, AI gates, RAG behavior, or publication controls change
> Last Updated: 2026-10-08
> Do NOT put here: provider secrets or unsupported live-health claims.

## AI roles

Public/user AI and admin AI are intentionally independent. Repository configuration uses USER_AI_ENABLED=false and ADMIN_AI_ENABLED=true. Public UI visibility is additionally controlled by NEXT_PUBLIC_USER_AI_ENABLED. Backend gating is authoritative.

## Provider model

The backend router represents Gemini, OpenRouter Llama, OpenRouter DeepSeek, Groq, Cerebras, Mistral, Cohere, NVIDIA NIM, and local fallback paths. Render configuration selects Mistral with model mistral-small-latest for admin AI. This is configuration, not proof of live provider health.

Always distinguish implemented, configured, enabled/selected, and live-tested states.

## RAG

RAG includes ingestion, chunking, embeddings, PostgreSQL/pgvector storage, source-aware retrieval, search ranking, batch ingestion, retry/error handling, metrics, alerts, and quality feedback.

## Reliability and observability

RAG error events, quality feedback, and A/B configuration now have a durable event-storage foundation via migration `20261008_0012`. The process-local caches remain optimization/UI state and are not authoritative. Alert notification adapters, retention/export, statistical evaluation, and database index telemetry remain future work and must not be described as live-verified.

## Publication safety

Publication-sensitive AI remains reviewable. Intended content path: Source/File/Feed → Extract/Normalize → Provenance → RAG → Research/Agent → Draft → SEO Packaging → Fact/Source QA → Human Approval → Publish.

Do not describe this as a verified universal one-click pipeline until the required live provider/storage and quality gates pass.


## Versioned embedding dimension migration (2026-10-11)

The owner-supplied `docs/master_result all` report identifies `voyage-3-lite` as a live-tested embedding model returning 512 dimensions and Cloudflare `@cf/baai/bge-m3` as returning 1,024 dimensions. The existing production pgvector column is `vector(768)`; vectors from different models/dimensions must not be compared or truncated.

A versioned 512-D path is now implemented additively:
- Migration `20261011_0013` adds nullable `embedding_v2_json`, `embedding_v2_model`, and PostgreSQL `embedding_v2 vector(512)`; the legacy 768-D column remains intact for rollback.
- `embed_text_v2` calls Voyage `voyage-3-lite`, validates exactly 512 dimensions, and fails closed if `VOYAGE_API_KEY` is missing or the provider response is invalid. It never substitutes hash or Cloudflare vectors into the Voyage model space.
- `RAG_EMBEDDING_VERSION=2` selects the versioned query/ingestion path. Keep it at `1` until migration is applied and the re-embedding backfill completes.
- From `web-platform/backend`, run `python -m alembic upgrade head`, then `VOYAGE_API_KEY=... python -m app.rag.reembed_v2 --dry-run`, then `VOYAGE_API_KEY=... python -m app.rag.reembed_v2 --batch-size 50`. Verify remaining rows is zero and test ingest/search before setting `RAG_EMBEDDING_VERSION=2`.
- The backfill is resumable and does not overwrite legacy vectors. If verification fails, leave the version flag at `1`; the old 768-D path remains available.

Cloudflare BGE-M3 is not configured as an automatic Voyage fallback because its 1,024-D vectors occupy a different embedding space. Using it requires a separate versioned 1,024-D migration/backfill and query route. User-supplied provider smoke notes do not establish production RAG E2E; ingest→search evidence remains pending until run and recorded.


## Actual runtime provider/key behavior (verified from code, 2026-10-11)

- The active backend LLMRouter in app/llm/router.py currently instantiates only OpenRouterProvider(model="openrouter/free") and FallbackLocalProvider. It deliberately ignores legacy provider/model selections to prevent accidental paid calls. Render ADMIN_AI_PROVIDER, ADMIN_AI_MODEL, and task-specific provider settings do not currently activate other provider adapters through this router.
- In production, local fallback defaults off unless explicitly overridden. Therefore OpenRouter quota/rate-limit failures can make generation fail instead of automatically switching to Groq, Cloudflare, Cohere, or Gemini. Provider smoke tests in docs/master_result all are endpoint tests, not proof that those adapters are active in the website runtime route.
- Key lookup for the active OpenRouter provider checks ADMIN_OPENROUTER_API_KEY or USER_OPENROUTER_API_KEY according to role, then OPENROUTER_API_KEY. These secrets must stay server-side; never expose them through frontend NEXT_PUBLIC variables.
- Current legacy RAG embedding path (RAG_EMBEDDING_VERSION=1) calls OpenRouter's embedding endpoint with liquid/lfm-2.5-embedding-350m:free, requests the configured 768-D shape, and uses deterministic local hash embeddings if the remote request fails or returns the wrong shape. Hash vectors are not semantic-model embeddings. The Voyage v2 path uses VOYAGE_API_KEY, requests voyage-3-lite at 512 dimensions, and fails closed instead of mixing model spaces.
- Cloudflare BGE-M3 is 1,024-D and cannot be substituted into the Voyage 512-D index. Although provider endpoint tests list Cloudflare chat, embeddings, image, and speech as available, current LLM routing does not automatically use Cloudflare as fallback.
- render.yaml sets USER_AI_ENABLED=false and ADMIN_AI_ENABLED=true. Admin AI generation still depends on the active OpenRouter-free route and its key/quota.
- Keep provider secrets only in Render environment variables/secret stores. Never commit them, put them in frontend variables, or paste them into logs/chat. Rotate any key exposed in a public repository, issue, workflow log, or other untrusted place.

## Voyage migration deployment update (2026-10-11)

Render deployment dep-db5nf395efls73aqkdi0 for commit 5a359f79f831ca8f0e925d7e1818f67c89659cf1 reached live. Startup logs show Alembic running upgrade 20261008_0012 → 20261011_0013 before Uvicorn started. The backfill has not been run or verified; keep RAG_EMBEDDING_VERSION=1 until pending-row count is zero and production ingest/search E2E passes.
