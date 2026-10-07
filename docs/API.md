# Logixa Flow — API

> Owner: Backend
> Update when: route contracts, auth requirements, or API behavior changes
> Last Updated: 2026-10-08
> Do NOT put here: secrets.

## Authentication

Protected admin endpoints use the existing admin authentication/authorization dependency. Backend authorization remains authoritative even when the frontend hides a feature.

## Chat sessions

Current admin routes include GET /api/chat/sessions?limit=<1-100>&offset=<n>, GET /api/chat/sessions/{session_id}, GET /api/chat/sessions/{session_id}/messages, GET /api/chat/sessions/{session_id}/restore, PATCH /api/chat/sessions/{session_id}/title, POST /api/chat/sessions/{session_id}/transfer, DELETE /api/chat/sessions/{session_id}, POST /api/chat/sessions/cleanup, and GET /api/chat/stats. Foreign, inactive, and ownerless sessions return not-found responses rather than exposing state.

## RAG

Admin routes cover search, batch search, metrics, performance, alerts/configuration, source ingestion, batch ingestion, quality feedback, quality reporting, and local A/B configuration. Their persistence limitations are documented in AI_RAG and OPERATIONS.

## Workflow dispatch

QStash delivery targets /api/admin/workflow/qstash-dispatch. The endpoint verifies QStash signing configuration before invoking the canonical workflow path.

## Import/upload

Admin bulk import is POST /api/admin/imports. Current documented support includes CSV, XLSX, and PDF, with a 10 MB import-file limit and a 5,000-row tabular limit.

## API rules

Keep owner scoping and authorization server-side. Sanitize provider/database errors. Preserve correlation IDs. Never expose service-role credentials.
