# Logixa Flow — Tools, Infrastructure, and AI/LLM Inventory

> Owner: Engineering / Operations
> Last Updated: 2026-10-10
> Purpose: Distinguish repository integrations from configured, selected, and live-verified services. This inventory intentionally contains no credentials.

## 1. Application and engineering stack

| Area | Tool / technology | Role and current status |
| --- | --- | --- |
| Frontend | Next.js, React, TypeScript | Main web application; package manifest and lockfile are the source of truth for versions. |
| UI / workflow canvas | React Flow (@xyflow/react), Radix UI, Tailwind CSS, Framer Motion, GSAP, Recharts, Three.js | UI, workflow visualization, animation, charts, and 3D visualization libraries. |
| Backend API | Python, FastAPI, Uvicorn, Pydantic | Main API service. |
| Database / ORM | Supabase PostgreSQL, SQLAlchemy, Alembic | Durable application state and schema migrations; production migration head verified through 20261008_0012. |
| Vector search | PostgreSQL pgvector | RAG vector storage/retrieval implementation; production end-to-end ingest/embed/search evidence remains pending. |
| Authentication | Supabase Auth, JWT/admin authorization | Production password-grant/admin API smoke passed in Production Auth Smoke run #11. |
| Tests / quality | pytest, Vitest, GitHub Actions, CodeQL, npm audit, pip-audit | Backend/agent/frontend test suites, CI, static security checks, and dependency audit. |
| Repository automation | GitHub / GitHub Actions / Dependabot | Source control, workflows, CI, release gates, dependency update automation. |

## 2. Hosting, scheduling, and operations

| Tool | Purpose | Current status / caveat |
| --- | --- | --- |
| Render | Production FastAPI Docker Web Service | Current production backend host; Free plan path uses one Web Service. |
| Vercel | Frontend hosting/integration | Existing production deployment serves traffic, but current-head GitHub integration was rate-limited by the Hobby build limit. Owner paused Vercel remediation; do not trigger extra builds until resumed. |
| Upstash QStash | Signed delivery, delay/retry dispatch | Signed delivery, durable workflow completion, and duplicate-delivery protection have live evidence. Retry/recovery and stale-claim live evidence remain pending. |
| Redis | Optional cache / broker integration | Optional; not a prerequisite for the current Render Free execution path. |
| Celery | Optional background task execution | CELERY_ENABLED=false in the current Render Free path; do not add a separate worker unless the architecture/plan changes. |
| Application health / logs / metrics | Render health endpoint, app logs, RAG observability tables | Health and migration checks exist; SLO window, alerts/escalation, and full production monitoring evidence remain pending. |

## 3. File and external service integrations

| Service / tool | Intended use | Evidence and limits |
| --- | --- | --- |
| Cloudinary | Small images/thumbnails | Live upload/read/delete passed; included in all-provider run #15. |
| Supabase Storage | Documents up to 50 MB | Live upload/read passed in run #15. Test now asserts cleanup DELETE is 2xx when the round-trip itself succeeds; run the targeted Supabase gate after this assertion change before claiming strict cleanup verification. |
| Backblaze B2 via S3-compatible API | Files over 50 MB up to 5 GB; private bucket | Authenticated provider-level upload/read/delete passed in run #12 and run #15. Application opaque download-proxy E2E remains pending. |
| Google Drive API / OAuth | Export reports and workflow backup artifacts | Live upload/read round-trip passed in run #14 and all-provider run #15. Wider export workflow semantics need separate direct evidence. |
| Email / newsletter | Newsletter and transactional delivery | Newsletter/test-send endpoints are intentionally HTTP 501 until a transactional email provider is integrated and configured; delivery evidence is pending. |
| RSS / feedparser | Feed/source collection | Feed ingestion implementation/dependency exists; full source-to-publish production journey remains deferred/pending. |
| Stripe | Payment integration library | SDK is present in frontend dependencies; presence alone does not establish a configured or live payment flow. |
| Nodemailer | Email client library | Frontend dependency exists; it does not prove production newsletter delivery is connected. |

## 4. LLM and AI model inventory

### Selected production generation route

- **OpenRouter openrouter/free** is the only remote text-generation route selected by the backend LLMRouter cost policy.
- The router only permits OpenRouter's free router or explicitly free model IDs; it normalizes other requested model IDs to openrouter/free.
- **Local fallback** is a simulated placeholder response, not a real local model. In production, ALLOW_LOCAL_LLM_FALLBACK defaults to false; generation can fail if OpenRouter is unavailable or unconfigured.
- The application seeds writer_ai_model=openrouter-free; Render's separate MISTRAL_MODEL=mistral-small-latest setting does not override the current router's OpenRouter-only generation policy.
- Admin AI defaults enabled and public/user AI defaults disabled in repository configuration. Feature gating and actual successful model calls are separate checks.

### Provider adapters present in code

| Provider / model family | Adapter default shown in code/config | Operational classification |
| --- | --- | --- |
| OpenRouter | openrouter/free | **Selected production remote route**; successful live generation/RAG journey still needs release evidence. |
| Gemini | gemini-2.5-flash | Adapter/config template exists; not in the active LLMRouter provider order. |
| Groq | llama-3.1-8b-instant | Adapter/config template exists; not in the active LLMRouter provider order. |
| Cerebras | gpt-oss-120b | Adapter/config template exists; not in the active LLMRouter provider order. |
| Mistral | mistral-small-latest | Adapter/config template exists; not in the active LLMRouter provider order despite a Render environment default. |
| Cohere | command-r-plus | Adapter/config template exists; not in the active LLMRouter provider order. |
| NVIDIA NIM | meta/llama-3.1-8b-instruct | Adapter/config template exists; not in the active LLMRouter provider order. |
| Local fallback | Placeholder string response | Test/development fallback only; **not** a deployed local inference engine. |
| Hugging Face | Token/model configuration and moderation-related flags exist in env templates | Not a text-generation route in the current backend LLMRouter; do not list it as an active LLM provider. |

The provider adapter file contains additional implementations, but only providers included in web-platform/backend/app/llm/router.py are part of that router's actual selection order. Environment keys alone do not mean a provider is active.

### Embeddings and retrieval

- The environment template sets EMBEDDING_MODEL=liquid/lfm-2.5-embedding-350m:free and EMBEDDING_DIMENSIONS=768.
- RAG code includes ingestion, chunking, embedding, PostgreSQL/pgvector storage, source-aware retrieval, ranking, retry/error handling, and observability.
- The configured embedding model is a configuration default, not evidence that production embedding calls currently succeed. A production ingest → embed → search journey remains a release gate.
- Prompt/retrieval sanitization and provider-error secret redaction are implemented in the backend router. These do not replace model output quality, factuality, and human-approval checks.

## 5. Current live-evidence snapshot

- Cloudinary: verified.
- Supabase Storage upload/read: verified; strict cleanup assertion added on 2026-10-10 and requires a targeted live rerun.
- B2 provider-level authenticated round-trip: verified; app-level opaque URL proxy: pending.
- Google Drive upload/read: verified.
- QStash signed delivery/completion/duplicate protection: verified; retry/recovery and stale-claim recovery: pending.
- Production Auth/API smoke: verified in run #11.
- Production application-schema backup/restore: verified; managed Auth/Storage, object-storage recovery, rollback, and post-rollback smoke: pending.
- RAG/AI publication journey, scheduled boundary, newsletter, provider failover, SLO/error budget, and alerting/escalation: pending.
- Release certification remains **PENDING FINAL EVIDENCE**.

## 6. Source of truth

Use repository code/configuration for implementation and selection claims, docs/RELEASE_EVIDENCE.md for live gate evidence, CURRENT_STATE.md for the current work queue, and docs/RELEASE_CERTIFICATION.md for the freeze decision. Never publish secret values in this inventory.
