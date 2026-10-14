# Logixa Flow — Tools, Infrastructure, and AI/LLM Inventory

> Owner: Engineering / Operations
> Last Updated: 2026-10-14
> Purpose: Distinguish repository integrations from configured, selected, and live-verified services. This inventory intentionally contains no credentials.

## 1. Application and engineering stack

| Area | Tool / technology | Role and current status |
| --- | --- | --- |
| Frontend | Next.js, React, TypeScript | Main web application; package manifest and lockfile are the source of truth for versions. |
| UI / workflow canvas | React Flow (@xyflow/react), Radix UI, Tailwind CSS, Framer Motion, GSAP, Recharts, Three.js | UI, workflow visualization, animation, charts, and 3D visualization libraries. |
| Backend API | Python, FastAPI, Uvicorn, Pydantic | Main API service. |
| Database / ORM | Supabase PostgreSQL, SQLAlchemy, Alembic | Durable application state and schema migrations; repository/live production migration head is `20261011_0013`. Current-schema backup/restore is still unverified. |
| Vector search | PostgreSQL pgvector | Production RAG ingest/embed/retrieval/citation is VERIFIED by [run #38227390320 attempt 4](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38227390320): 7 public RSS sources, 7 valid Voyage 512-D chunks, 5 matches, and a non-empty citation. The wider Agent→Brain→approval→Publish journey remains pending. |
| Authentication | Supabase Auth, JWT/admin authorization | Authenticated Admin Brain API/UI smoke passed in [run #38418481082](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38418481082); authenticated RAG ingestion/citation passed in [run #38227390320 attempt 4](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38227390320). |
| Tests / quality | pytest, Vitest, GitHub Actions, CodeQL, npm audit, pip-audit | Backend/agent/frontend test suites, CI, static security checks, and dependency audit. |
| Repository automation | GitHub / GitHub Actions / Dependabot | Source control, workflows, CI, release gates, dependency update automation. |

## 2. Hosting, scheduling, and operations

| Tool | Purpose | Current status / caveat |
| --- | --- | --- |
| Render | Production FastAPI Docker Web Service | Current production backend host; Free plan path uses one Web Service. |
| Vercel | Frontend hosting/integration | Existing production deployment serves traffic, but current-head GitHub integration was rate-limited by the Hobby build limit. Owner paused Vercel remediation; do not trigger extra builds until resumed. |
| Upstash QStash | Signed delivery, delay/retry dispatch | US-region signature validation reaches payload validation, but the latest empty-run-ID smoke returned HTTP 400 as expected; historical EU deliveries returned HTTP 401 Invalid QStash signature. Workflow-run and schedule lists are empty in both regions, so durable delivery/completion/idempotency and stale-claim recovery are NOT live-verified. |
| Redis | Optional cache / broker integration | Optional; not a prerequisite for the current Render Free execution path. |
| Celery | Optional background task execution | CELERY_ENABLED=false in the current Render Free path; do not add a separate worker unless the architecture/plan changes. |
| Application health / logs / metrics | Render health endpoint, app logs, RAG observability tables | Post-deploy /health returned HTTP 200 in 2.073 seconds for commit ede412e03dad4ab1cd15ee436c722c0f1581ea4e; startup logged Workflow recovery restored 0 pending run(s). Render http_request_count and http_latency metrics returned empty datapoints for the inspected window; SLO and alert-path evidence remain pending. |

## 3. File and external service integrations

| Service / tool | Intended use | Evidence and limits |
| --- | --- | --- |
| Cloudinary | Small images/thumbnails | Live upload/read/delete passed; included in all-provider run #15. |
| Supabase Storage | Documents up to 50 MB | Live upload/read/cleanup evidence exists from all-provider run #15; the strict cleanup DELETE assertion was verified by targeted run #17. This does not certify managed Auth recovery or full object-storage DR. |
| Backblaze B2 via S3-compatible API | Files over 50 MB up to 5 GB; private bucket | Provider-level upload/read/delete passed; deployed application private upload→download/readback→cleanup passed in [run #38049146602](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38049146602). Full object-storage DR and recovery remain pending. |
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
- The configured embedding model is a configuration default, not evidence that production embedding calls currently succeed. A production ingest → embed → search journey remains a release gate. If OpenRouter embedding fails or returns a vector dimension mismatch, code falls back to deterministic local hash embeddings; this is not a local semantic model and has lower retrieval quality.
- **Data privacy:** the configured free Liquid embedding provider's retention/training policy must be reviewed before sending confidential documents to the remote endpoint. The deterministic hash fallback avoids sending the text externally but is lower quality. Do not treat a free price as a privacy guarantee.
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


## 2026-10-11 — Provider smoke notes and embedding fallback diagnostics

- Owner-supplied provider smoke results report successful HTTP/reply checks for Gemini, Groq, Mistral, Cohere, and several Cloudflare Workers AI models; OpenRouter returned HTTP 429 or empty replies, Cerebras/Hugging Face returned HTTP 402, and NVIDIA credentials were absent. These are user-supplied endpoint smoke notes, not independently linked evidence and not proof that the application router invokes these providers.
- The production backend intentionally remains on the OpenRouter free-only generation route until provider cost/terms and routing approval are explicit. A successful HTTP status alone does not prove zero cost, stable availability, or app-level failover.
- RAG still requests 768-dimensional embeddings to preserve existing stored-vector compatibility. Owner-supplied Voyage (512-D) and Cloudflare BGE-M3 (1024-D) checks do not match that configured shape. Do not change the dimension or truncate vectors without a versioned migration, full re-embedding/backfill, query/index update, and rollback plan.
- Commit 4746ffc0b89aee5581e6c74308a9e1db46e7dbe0 adds safe warning logs when the free embedding call is missing credentials, fails, returns an invalid response, or returns the wrong dimension. It deliberately retains the stable `hash:fallback` model marker and does not silently switch to a potentially billable embedding API.
- Production RAG ingest → semantic search and publication E2E remain PENDING.
