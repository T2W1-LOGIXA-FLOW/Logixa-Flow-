# AI Agents Setup

This document is the onboarding contract for AI agents and background workers working on Logixa Flow.

## Project identity

**Name:** Logixa Flow  
**Type:** AI-Powered Supply Chain Intelligence and Workflow Automation Platform  
**Purpose:** Combine supply-chain data, documents, AI, knowledge retrieval, workflows, and automation into one reviewable operating system.

The platform contains a public knowledge website, private admin control plane, RAG knowledge layer, AI-agent layer, CMS/publishing layer, and durable workflow orchestration layer.

## Architecture mental model

```
User
  ↓
Frontend (Next.js / Vercel)
  ↓
Backend API (FastAPI / Render)
  ├── Auth / Admin authorization
  ├── Chat
  ├── Agents
  ├── RAG
  ├── Workflow
  ├── Controllers / Scheduling
  ├── CMS / Sources
  └── Operations
       ↓
Supabase PostgreSQL + pgvector
       ↓
AI providers / Object storage / RSS / Email
```

Think of Logixa Flow as:

> An AI-powered supply-chain intelligence operating system with a public knowledge site, admin control plane, RAG knowledge layer, AI-agent layer, content review/publishing layer, and durable workflow orchestration.

Do not reduce it to only a blog, chatbot, RSS scraper, CMS, workflow editor, or AI demo. The product is the combination.

## Key subsystems

### 1. Source and integration layer
- `IntelligenceSource` source registry.
- Source type/category/trust information.
- RSS/feed collection.
- Duplicate detection.
- `integration_service.py` for source synchronization and agent-preview integration.
- External integrations must be treated as untrusted input and isolated from core execution.

### 2. RAG / knowledge layer
- Document/file ingestion.
- Text chunking.
- Gemini embeddings (currently verified live for embedding calls).
- PostgreSQL + pgvector vector storage.
- Similarity search and context construction.
- Source-grounded retrieval.
- Batch ingestion progress and recovery metadata.
- Search/ingestion retry handling, correlation IDs, metrics, and alerts.
- Quality feedback and RAG search evaluation hooks.

### 3. AI layer
- Public/user chat.
- Admin chat.
- Agent runs and persisted agent steps.
- AI Memory / Brain.
- Human review lifecycle.
- Confidence/hallucination/feedback quality signals.
- Multi-provider LLM router with provider-specific fallback ordering.

Current backend router providers include:
- Gemini
- OpenRouter Llama
- OpenRouter DeepSeek
- Groq
- Cerebras
- Mistral
- Cohere
- NVIDIA NIM
- local fallback

Provider availability is configuration-dependent. Never document an unavailable provider as guaranteed live.

### 4. Workflow / automation layer
Canonical implementation:

`web-platform/backend/app/routers/workflow.py`

Capabilities include:
- Workflow definitions.
- Dependency-aware execution.
- Registered node actions.
- Approval nodes.
- Retry and timeout handling.
- Execution queue and priority.
- Durable workflow/run persistence.
- Scheduled workflow jobs.
- Controller-triggered execution.
- Execution history and telemetry.
- Restart recovery.

The in-process dictionaries in the workflow module are execution caches/state holders; PostgreSQL persistence is the durable source of truth. Do not replace the canonical engine with a second in-memory workflow implementation.

### 5. CMS / publishing layer
- Posts and drafts.
- Categories and content types.
- Publication state.
- Brain-to-content review flow.
- Public publishing.
- Human approval for publication-sensitive AI output.

### 6. Background agents
The `agents/` folder is a secondary content/automation pipeline, separate from the main FastAPI web service. It is not required for the current Render Free production runtime; durable workflow execution is handled by QStash → FastAPI → PostgreSQL.

Conceptual content pipeline:

`Collector → source normalization → Writer/Manager → Publisher → Backend review/publish flow`

The canonical durable workflow engine remains `backend/app/routers/workflow.py`. The `agents/` pipeline should integrate with that engine rather than become a second workflow runtime.

### 7. Business and operations
- Logistics estimator.
- Finance.
- AI/API usage and cost tracking.
- Analytics.
- Email/newsletter.
- User submissions.
- Moderation/engagement.

## Important engineering principles

1. Preserve `backend/app/routers/workflow.py` as the canonical workflow implementation.
2. Do not create duplicate workflow engines or routers.
3. Treat PostgreSQL persistence as the durable source of truth for workflow definitions/runs.
4. Frontend workflow UI uses `@xyflow/react`.
5. Never expose backend AI provider secrets to the frontend.
6. Preserve human approval for publication-sensitive AI output.
7. Prefer source-grounded RAG for intelligence generation.
8. Keep public user AI and admin AI roles/configuration separable.
9. Treat AI output as reviewable intelligence, not automatically trusted truth.
10. When changing workflow behavior, update persistence, recovery, and tests together.
11. When changing RAG behavior, consider ingestion, embedding, retrieval, quality, telemetry, and failure handling together.
12. When adding automation, connect it to the existing Workflow/Controller architecture.
13. For content automation, prefer Source → RAG → Agent → Brain → Approval → Publish.
14. Do not silently broaden CORS, storage permissions, database grants, or provider exposure.
15. Never commit real secrets, tokens, database URLs, or admin passwords.
16. Sanitize provider errors before logging.
17. Preserve rate limiting on externally reachable AI/API endpoints.
18. Validate uploaded file types and size before processing.
19. Do not describe mocked/test-only flows as production functionality.
20. When documentation and code disagree, inspect the current code/tests first and update the documentation to match reality.

## File reading order for new agents

1. `README.md`
2. `PROJECT_OVERVIEW.md`
3. `docs/AI_AGENTS_SETUP.md`
4. `web-platform/backend/app/main.py`
5. `web-platform/backend/app/models.py`
6. `web-platform/backend/app/schemas.py`
7. `web-platform/backend/app/security.py`
8. `web-platform/backend/app/llm/router.py`
9. `web-platform/backend/app/llm/providers.py`
10. `web-platform/backend/app/rag/`
11. `web-platform/backend/app/routers/agent.py`
12. `web-platform/backend/app/routers/chat.py`
13. `web-platform/backend/app/routers/rag.py`
14. `web-platform/backend/app/routers/workflow.py`
15. `web-platform/backend/app/routers/controllers.py`
16. `web-platform/backend/app/integration_service.py`
17. `web-platform/backend/app/scheduler.py`
18. `agents/main_pipeline.py`
19. `agents/collector.py`
20. `agents/writer.py`
21. `agents/manager.py`
22. `agents/publisher.py`
23. `agents/bridge.py`
24. `web-platform/frontend/src/components/admin/AdminSidebar.tsx`
25. `web-platform/frontend/src/app/admin/workflow/`
26. `web-platform/frontend/src/components/api.ts`

## AI provider setup

Provider secrets stay on Render/backend or the dedicated worker. The frontend must never receive provider secrets.

Typical backend variables include:

```text
LLM_PROVIDER=gemini
GEMINI_API_KEY=<secret>
OPENROUTER_API_KEY=<secret>
GROQ_API_KEY=<secret>
HUGGINGFACE_API_KEY=<secret>
REQUIRE_AI_KEY=false
STRICT_LLM_ERRORS=false
```

Only configured/available providers participate in routing. Provider configuration is not the same as provider health: a key can be configured while the upstream service is rate-limited or temporarily unavailable. Live health checks must record provider state without exposing credentials.

Task-aware routing is supported without duplicating provider credentials. Optional backend variables can select a provider for a task while preserving the normal fallback chain:

```text
AI_TASK_PROVIDER_RESEARCH=...
AI_TASK_MODEL_RESEARCH=...
AI_TASK_PROVIDER_ANALYSIS=...
AI_TASK_MODEL_ANALYSIS=...
AI_TASK_PROVIDER_WRITING=...
AI_TASK_MODEL_WRITING=...
AI_TASK_PROVIDER_SEO=...
AI_TASK_MODEL_SEO=...
AI_TASK_PROVIDER_FACTCHECK=...
AI_TASK_MODEL_FACTCHECK=...
```

Use provider names such as `gemini`, `groq`, `cerebras`, `mistral`, `cohere`, `nvidia`, `openrouter-llama`, or `openrouter-deepseek`. Leave a task override empty when the role-level provider should remain the default. This is a routing layer, not a requirement to create a separate API key for every agent.

## Agent execution graph

The canonical admin content path is now a persisted multi-stage execution graph:

`Source → RAG evidence → Research → Analysis → Writing → SEO → Fact Check → Quality Gate → Human Review → Publish`

Each AI node is executed independently through the shared LLM router with task-aware provider selection. Every node writes an `agent_steps` record with execution status, provider/model, token usage, structured output, and sanitized error state. The graph never auto-publishes content; the final Brain item remains private and reviewable.

Node responsibilities:

- **Research:** extract source-grounded claims, evidence, gaps, and provenance.
- **Analysis:** convert evidence into operational signals, impacts, risks, and implications.
- **Writing:** create the private editorial draft.
- **SEO:** produce search metadata and internal-link topics without changing factual claims.
- **Fact Check:** classify claims as pass/review/fail against supplied evidence.
- **Quality Gate:** decide whether the artifact is ready for human review and list required edits.

Provider routing remains centralized. Agents do not receive separate frontend credentials and do not require a unique API key per node. Configure task-specific providers/models only when there is a deliberate reason to specialize a task.

## Legacy agent-service pipeline

The repository still contains an optional `agents/` content pipeline for compatibility and local/managed deployments. It is **not part of the current Render Free production runtime**.

Production workflow execution uses:

`QStash → FastAPI → PostgreSQL`

Do not create or re-enable a Render Background Worker as a prerequisite for production. If the legacy agent-service pipeline is enabled in another environment, it must use the scoped `AGENT_SERVICE_TOKEN` and remain separate from human admin authentication.

## Verification checklist

Before declaring a change complete:

1. Backend `/health` responds successfully.
2. CI/build/tests pass.
3. Admin routes remain authorization-protected.
4. Provider secrets are absent from frontend code/build output.
5. RAG ingestion/search paths have tests and failure handling.
6. Workflow state is persisted and recovery remains intact.
7. Approval nodes pause and resume correctly.
8. Controllers enqueue the canonical workflow engine.
9. External provider failures degrade/fallback rather than crash the application.
10. File imports enforce type/size/row constraints.
11. Logs do not expose secrets.
12. Production deployment is checked after changes.

## Do not overclaim

A passing unit test is not proof of a live third-party integration. A provider key being configured is not proof that the provider is currently healthy. A UI page existing is not proof that its complete backend workflow is operational.

Use precise language such as:
- implemented
- covered by tests
- verified in production
- provider configured
- provider temporarily unavailable
- manual/live E2E still required

rather than claiming universal availability.


## Current production feature gates

Public AI and admin AI are deliberately independent:

- `USER_AI_ENABLED=false` — public AI is off by default.
- `ADMIN_AI_ENABLED=true` — admin AI remains enabled by default.
- `NEXT_PUBLIC_USER_AI_ENABLED=false` — public AI UI remains hidden unless explicitly enabled in the frontend deployment.
- Backend enforcement is authoritative; hiding the UI is not a security control by itself.
- AI provider credentials remain server-side and role-specific.

This does not disable source ingestion, RAG, admin agent runs, Brain review, drafting, workflow automation, or publication review.

## Source-to-content pipeline boundary

The repository already contains the major building blocks for source-driven content:

`file/feed/source → ingestion → chunking/embedding → retrieval → agent generation → Brain/draft → review → publish`

CSV/XLSX/PDF import is implemented, and RAG supports batch ingestion/recovery reporting. Before claiming universal one-click publishing, validate each real production storage/provider path and preserve source provenance down to the relevant file/page/sheet/row or URL where practical.

## SEO/news quality gate

Content automation should package SEO metadata alongside the draft and then validate:

- title and search-intent alignment
- meta description and slug
- canonical URL
- Open Graph/social metadata
- structured data
- internal-link opportunities
- source attribution and freshness
- duplicate/corroboration checks for news
- factual/source-grounding review
- human approval before publication



## Phase completion boundary

Implementation phases are intentionally separated from live verification. The codebase now has one persisted agent execution graph for admin, scheduled, and integration previews, task-aware provider routing, per-step usage/cost metadata, grounded evidence flow, fact-checking, quality gating, and human approval before publication.

The remaining final verification phase is deliberately deferred until the implementation surface is stable. It requires real provider credentials and authenticated production tests. No provider secret is required to continue the current coding hardening work.

