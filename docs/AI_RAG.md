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
