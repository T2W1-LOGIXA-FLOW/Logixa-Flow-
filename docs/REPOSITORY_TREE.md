# Repository Structure — Logixa Flow

> **Purpose:** Canonical file-and-directory tree for the repository, generated from Git's tracked-file index.
> **Repository:** `T2W1-LOGIXA-FLOW/Logixa-Flow-`
> **Branch:** `main`
> **Snapshot commit:** `b67dd0c4c76455d80321bad2e94e3f71c2649468`
> **Generated:** 2026-10-15
> **Tracked files at snapshot:** 472

## Scope and accuracy

This tree lists every file tracked by Git at the snapshot commit and the directories implied by those paths. It is not a dump of every byte or every file that might exist in a developer's working directory. Git-ignored files, local-only/untracked files, installed dependencies, build outputs, caches, and runtime-generated files are not represented unless they are tracked. Empty directories are not represented because Git does not track empty directories. Submodules, if any, are represented by their tracked path rather than expanded contents.

The tree is sorted with directories first and names alphabetically within each group. For a current snapshot, regenerate from the target checkout with `git ls-files -z` after checking out the intended commit/branch. If you need an on-disk inventory including ignored and untracked files, use a filesystem traversal separately and handle secrets and generated artifacts carefully.

## Full tracked repository tree

```text
Logixa-Flow-/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── codeql.yml
│   │   ├── live-release-gates.yml
│   │   ├── production-admin-ui-smoke.yml
│   │   ├── production-auth-smoke.yml
│   │   ├── production-backup-restore.yml
│   │   └── production-slo-probe.yml
│   └── dependabot.yml
├── agents/
│   ├── .dockerignore
│   ├── .env.example
│   ├── bridge.py
│   ├── collector.py
│   ├── config.py
│   ├── Dockerfile
│   ├── main_pipeline.py
│   ├── manager.py
│   ├── memory_analytics.py
│   ├── publisher.py
│   ├── requirements.txt
│   ├── test_agent_service_auth.py
│   ├── test_publisher_html_safety.py
│   ├── worker_loop.py
│   └── writer.py
├── archive/
│   └── legacy/
│       ├── AI_AGENTS_SETUP.md
│       ├── CHAT_SESSION_ENHANCEMENT.md
│       ├── DATABASE_SECURITY_MODEL.md
│       ├── DEPLOY_CHECKLIST.md
│       ├── LAYER_INSIGHTS.md
│       ├── production-env-checklist.md
│       ├── RAG_ERROR_REPORTING.md
│       └── README.md
├── docs/
│   ├── AI_RAG.md
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── DEPLOYMENT.md
│   ├── DEVELOPMENT.md
│   ├── DR_ROLLBACK.md
│   ├── INFRASTRUCTURE_AUDIT_2026-10-15.md
│   ├── master_result all
│   ├── OPERATIONS.md
│   ├── PRODUCTION_ACCESS.md
│   ├── RELEASE_CERTIFICATION.md
│   ├── RELEASE_EVIDENCE.md
│   ├── REPO_INFRA_AUDIT.md
│   ├── SLO_ERROR_BUDGET.md
│   ├── STORAGE.md
│   ├── TELEGRAM_INTEGRATION.md
│   ├── TESTING.md
│   ├── TOOLS_AND_LLM_INVENTORY.md
│   └── TROUBLESHOOTING.md
├── web-platform/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── llm/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── providers.py
│   │   │   │   └── router.py
│   │   │   ├── rag/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── chunking.py
│   │   │   │   ├── embeddings.py
│   │   │   │   ├── ingest.py
│   │   │   │   ├── observability.py
│   │   │   │   ├── pgvector_store.py
│   │   │   │   ├── reembed_v2.py
│   │   │   │   ├── sanitizer.py
│   │   │   │   ├── search.py
│   │   │   │   ├── semantic_cache.py
│   │   │   │   └── vector_math.py
│   │   │   ├── routers/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── admin.py
│   │   │   │   ├── agent.py
│   │   │   │   ├── analytics.py
│   │   │   │   ├── auth.py
│   │   │   │   ├── chat.py
│   │   │   │   ├── contacts.py
│   │   │   │   ├── controllers.py
│   │   │   │   ├── costs.py
│   │   │   │   ├── diagnostics.py
│   │   │   │   ├── email_templates.py
│   │   │   │   ├── estimator.py
│   │   │   │   ├── finance.py
│   │   │   │   ├── integration.py
│   │   │   │   ├── knowledge.py
│   │   │   │   ├── metrics.py
│   │   │   │   ├── moderation.py
│   │   │   │   ├── posts.py
│   │   │   │   ├── rag.py
│   │   │   │   ├── settings.py
│   │   │   │   ├── submissions.py
│   │   │   │   ├── subscribers.py
│   │   │   │   ├── system.py
│   │   │   │   ├── telegram.py
│   │   │   │   ├── uploads.py
│   │   │   │   ├── usage.py
│   │   │   │   └── workflow.py
│   │   │   ├── services/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── ai_usage_tracker.py
│   │   │   │   └── telegram.py
│   │   │   ├── tests/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── test_agent_brief_safety.py
│   │   │   │   ├── test_agent_recovery.py
│   │   │   │   ├── test_agent_service_auth.py
│   │   │   │   ├── test_ai_sanitizer.py
│   │   │   │   ├── test_auth_lifecycle.py
│   │   │   │   ├── test_brain_unpublish.py
│   │   │   │   ├── test_chat_migration_structure.py
│   │   │   │   ├── test_chat_ownership.py
│   │   │   │   ├── test_chat_session_enhancement.py
│   │   │   │   ├── test_config.py
│   │   │   │   ├── test_dsr.py
│   │   │   │   ├── test_feed_management.py
│   │   │   │   ├── test_feedmanager_component_exists.py
│   │   │   │   ├── test_infrastructure.py
│   │   │   │   ├── test_integration_service_html_safety.py
│   │   │   │   ├── test_knowledge_import.py
│   │   │   │   ├── test_llm_router.py
│   │   │   │   ├── test_logging_config.py
│   │   │   │   ├── test_posts_agent_publish.py
│   │   │   │   ├── test_rag_advanced_search.py
│   │   │   │   ├── test_rag_alerts.py
│   │   │   │   ├── test_rag_batch_ingestion.py
│   │   │   │   ├── test_rag_embeddings.py
│   │   │   │   ├── test_rag_ingestion_errors.py
│   │   │   │   ├── test_rag_metrics.py
│   │   │   │   ├── test_rag_observability.py
│   │   │   │   ├── test_rag_performance.py
│   │   │   │   ├── test_rag_quality.py
│   │   │   │   ├── test_rag_search.py
│   │   │   │   ├── test_rag_search_errors.py
│   │   │   │   ├── test_rls_security_migration.py
│   │   │   │   ├── test_scheduler.py
│   │   │   │   ├── test_schema_migration_lifecycle.py
│   │   │   │   ├── test_workflow_execution.py
│   │   │   │   ├── test_workflow_orchestration.py
│   │   │   │   └── test_workflow_persistence.py
│   │   │   ├── workers/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── celery_app.py
│   │   │   │   └── tasks.py
│   │   │   ├── __init__.py
│   │   │   ├── agent_graph.py
│   │   │   ├── agent_recovery.py
│   │   │   ├── analytics.py
│   │   │   ├── cache.py
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   ├── db_bootstrap.py
│   │   │   ├── integration_service.py
│   │   │   ├── logging_config.py
│   │   │   ├── logistics_estimator.py
│   │   │   ├── main.py
│   │   │   ├── middleware.py
│   │   │   ├── models.py
│   │   │   ├── qstash.py
│   │   │   ├── scheduler.py
│   │   │   ├── schemas.py
│   │   │   ├── security.py
│   │   │   └── storage.py
│   │   ├── migrations/
│   │   │   ├── versions/
│   │   │   │   ├── 20260602_0001_initial_schema.py
│   │   │   │   ├── 20260602_0002_document_embeddings.py
│   │   │   │   ├── 20260606_0003_pgvector_embedding.py
│   │   │   │   ├── 20260902_0004_chat_session_owner.py
│   │   │   │   ├── 20261003_0005_supabase_rls_grants.py
│   │   │   │   ├── 20261003_0006_reconcile_current_application_schema.py
│   │   │   │   ├── 20261005_0007_convert_money_to_numeric.py
│   │   │   │   ├── 20261005_0008_workflow_job_claim_metadata.py
│   │   │   │   ├── 20261005_0009_audit_events.py
│   │   │   │   ├── 20261005_0010_stored_files.py
│   │   │   │   ├── 20261007_0011_agent_step_execution_metadata.py
│   │   │   │   ├── 20261008_0012_rag_observability.py
│   │   │   │   └── 20261011_0013_voyage_embedding_v2.py
│   │   │   ├── env.py
│   │   │   └── script.py.mako
│   │   ├── scripts/
│   │   │   └── dry_run_tasks.py
│   │   ├── tests/
│   │   │   ├── test_agent_graph.py
│   │   │   ├── test_brain_category_serialization.py
│   │   │   ├── test_google_drive_credentials.py
│   │   │   ├── test_live_release_gates.py
│   │   │   ├── test_phase4_diagnostics.py
│   │   │   ├── test_phase5_integration.py
│   │   │   ├── test_phase6_e2e.py
│   │   │   ├── test_request_observability.py
│   │   │   ├── test_storage_public_base_url.py
│   │   │   ├── test_storage_upload.py
│   │   │   └── test_workflow_integration.py
│   │   ├── .dockerignore
│   │   ├── .env.example
│   │   ├── alembic.ini
│   │   ├── Dockerfile
│   │   ├── render.yaml
│   │   ├── requirements-postgres.txt
│   │   ├── requirements.txt
│   │   ├── seed_controllers.py
│   │   ├── seed_email_templates.py
│   │   └── seed_submissions.py
│   ├── frontend/
│   │   ├── public/
│   │   │   ├── assets/
│   │   │   │   └── logixa-network-bg.svg
│   │   │   ├── images/
│   │   │   │   ├── cargo-plane.jpg.png
│   │   │   │   ├── container-ship.jpg.png
│   │   │   │   ├── container-truck.jpg.png
│   │   │   │   ├── logo.svg
│   │   │   │   ├── myanmar-map.svg
│   │   │   │   ├── page.jpg.png
│   │   │   │   └── warehouse-complex.jpg.png
│   │   │   ├── manifest.json
│   │   │   ├── robots.txt
│   │   │   ├── service-worker.js
│   │   │   └── workbox-4754cb34.js
│   │   ├── scripts/
│   │   │   ├── production-admin-ui-smoke.mjs
│   │   │   └── ui-check.js
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── about/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── admin/
│   │   │   │   │   ├── agent-chat/
│   │   │   │   │   │   ├── page.test.tsx
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── agents/
│   │   │   │   │   │   ├── agent-theme.module.css
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── analytics/
│   │   │   │   │   │   ├── page.test.tsx
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── articles/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── brain/
│   │   │   │   │   │   ├── page.test.tsx
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── chat/
│   │   │   │   │   │   ├── page.test.tsx
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── content/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── controllers/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── costs/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── deployments/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── drafts/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── email-templates/
│   │   │   │   │   │   ├── page.test.tsx
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── estimator/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── feeds/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── finance/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── forgot-password/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── import/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── insights/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── login/
│   │   │   │   │   │   ├── page.test.tsx
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── memory/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── payments/
│   │   │   │   │   │   ├── page.test.tsx
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── rag/
│   │   │   │   │   │   ├── alerts/
│   │   │   │   │   │   │   ├── page.test.tsx
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   ├── ingest/
│   │   │   │   │   │   │   ├── page.batch.test.tsx
│   │   │   │   │   │   │   ├── page.test.tsx
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   ├── metrics/
│   │   │   │   │   │   │   ├── page.test.tsx
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   ├── performance/
│   │   │   │   │   │   │   ├── page.test.tsx
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   ├── quality/
│   │   │   │   │   │   │   ├── page.test.tsx
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   ├── search/
│   │   │   │   │   │   │   ├── page.advanced.test.tsx
│   │   │   │   │   │   │   ├── page.test.tsx
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── reset-password/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── settings/
│   │   │   │   │   │   ├── 2fa/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   ├── page.test.tsx
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── submissions/
│   │   │   │   │   │   ├── page.test.tsx
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── system/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── usage/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── workflow/
│   │   │   │   │   │   ├── navigation.test.tsx
│   │   │   │   │   │   ├── page.css
│   │   │   │   │   │   ├── page.test.tsx
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   ├── ProcessCostPanel.tsx
│   │   │   │   │   │   ├── websocket.test.tsx
│   │   │   │   │   │   └── WorkflowSidebar.tsx
│   │   │   │   │   ├── admin-theme.module.css
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   ├── metadata.ts
│   │   │   │   │   ├── page.test.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── agent/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── analytics/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── api/
│   │   │   │   │   ├── admin/
│   │   │   │   │   │   └── analytics/
│   │   │   │   │   │       └── route.ts
│   │   │   │   │   ├── checkout/
│   │   │   │   │   │   ├── route.test.ts
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── contact/
│   │   │   │   │   │   ├── route.test.ts
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── csp-report/
│   │   │   │   │   │   ├── route.test.ts
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── webhooks/
│   │   │   │   │       └── stripe/
│   │   │   │   │           ├── route.test.ts
│   │   │   │   │           └── route.ts
│   │   │   │   ├── blog/
│   │   │   │   │   ├── [slug]/
│   │   │   │   │   │   ├── page.test.tsx
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── case-studies/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── checkout/
│   │   │   │   │   ├── cancel/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── success/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── contact/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── estimator/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── faq/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── features/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── insights/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── notifications/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── payments/
│   │   │   │   │   └── history/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── preferences/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── pricing/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── privacy/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── search/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── terms/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── error.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── not-found.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   └── sitemap.ts
│   │   │   ├── components/
│   │   │   │   ├── admin/
│   │   │   │   │   ├── agent/
│   │   │   │   │   │   ├── AdminAgentCard.tsx
│   │   │   │   │   │   ├── AdminAgentErrorState.tsx
│   │   │   │   │   │   ├── AdminAgentMetrics.tsx
│   │   │   │   │   │   ├── AdminAgentStatusBadge.tsx
│   │   │   │   │   │   ├── AdminAgentTimeline.tsx
│   │   │   │   │   │   └── AdminConversationMonitor.tsx
│   │   │   │   │   ├── AdminBreadcrumb.tsx
│   │   │   │   │   ├── AdminCard.tsx
│   │   │   │   │   ├── AdminEmptyState.tsx
│   │   │   │   │   ├── AdminGridSkeleton.tsx
│   │   │   │   │   ├── AdminMetricCard.tsx
│   │   │   │   │   ├── AdminSearchBar.tsx
│   │   │   │   │   ├── AdminShell.tsx
│   │   │   │   │   ├── AdminSidebar.tsx
│   │   │   │   │   ├── AdminStatusBadge.tsx
│   │   │   │   │   └── AdminTopbar.tsx
│   │   │   │   ├── charts/
│   │   │   │   │   ├── CostsChart.tsx
│   │   │   │   │   └── MetricsChart.tsx
│   │   │   │   ├── estimator/
│   │   │   │   │   ├── EstimatorForm.tsx
│   │   │   │   │   ├── EstimatorResults.tsx
│   │   │   │   │   └── VehicleSelector.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   └── use-auto-resize-textarea.ts
│   │   │   │   ├── pages/
│   │   │   │   │   ├── AboutContent.tsx
│   │   │   │   │   ├── BlogContent.tsx
│   │   │   │   │   └── ContactContent.tsx
│   │   │   │   ├── providers/
│   │   │   │   │   └── AnimationProvider.tsx
│   │   │   │   ├── shadcn/
│   │   │   │   │   ├── AppShell.tsx
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   ├── Card.tsx
│   │   │   │   │   ├── Input.tsx
│   │   │   │   │   ├── LanguageToggle.tsx
│   │   │   │   │   ├── MobileDrawer.tsx
│   │   │   │   │   ├── navigation-menu.tsx
│   │   │   │   │   ├── popover.tsx
│   │   │   │   │   ├── Skeleton.tsx
│   │   │   │   │   ├── Textarea.tsx
│   │   │   │   │   ├── ThemeProvider.tsx
│   │   │   │   │   └── ThemeToggle.tsx
│   │   │   │   ├── ui/
│   │   │   │   │   ├── ai-input-with-loading.tsx
│   │   │   │   │   ├── animated-shiny-text.tsx
│   │   │   │   │   ├── BackToTop.tsx
│   │   │   │   │   ├── bento-grid.tsx
│   │   │   │   │   ├── features-section.tsx
│   │   │   │   │   ├── globe-canvas.tsx
│   │   │   │   │   ├── globe-hero.tsx
│   │   │   │   │   ├── LiveCounter.tsx
│   │   │   │   │   ├── Logo.tsx
│   │   │   │   │   ├── map.tsx
│   │   │   │   │   ├── PageTransition.tsx
│   │   │   │   │   ├── testimonials-section.tsx
│   │   │   │   │   ├── Toaster.tsx
│   │   │   │   │   ├── TypeWriter.tsx
│   │   │   │   │   └── wireframe-dotted-globe.tsx
│   │   │   │   ├── 3DCoverflowSlider.tsx
│   │   │   │   ├── AccessibilityHooks.tsx
│   │   │   │   ├── AdminDashboard.tsx
│   │   │   │   ├── AgentThinkingPanel.tsx
│   │   │   │   ├── AmbientGlow.tsx
│   │   │   │   ├── AnalyticsDashboard.tsx
│   │   │   │   ├── api.test.ts
│   │   │   │   ├── api.ts
│   │   │   │   ├── BackgroundSphere.tsx
│   │   │   │   ├── BentoGrid.tsx
│   │   │   │   ├── BlogPDFExport.tsx
│   │   │   │   ├── BlogSearch.tsx
│   │   │   │   ├── Citations.tsx
│   │   │   │   ├── Comments.tsx
│   │   │   │   ├── ConditionalLayout.tsx
│   │   │   │   ├── ContactForm.tsx
│   │   │   │   ├── CostDashboard.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   ├── EnhancedSearchAndFilter.tsx
│   │   │   │   ├── ErrorState.tsx
│   │   │   │   ├── FeedbackRating.tsx
│   │   │   │   ├── FeedManager.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── FormattedDate.tsx
│   │   │   │   ├── FormValidation.tsx
│   │   │   │   ├── GeometricSphere.tsx
│   │   │   │   ├── GLTFModelViewer.tsx
│   │   │   │   ├── GoogleAnalytics.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── HomeKnowledgeStrip.tsx
│   │   │   │   ├── ImportCalendar.tsx
│   │   │   │   ├── InsightForm.tsx
│   │   │   │   ├── IntegrationTriggers.test.tsx
│   │   │   │   ├── IntegrationTriggers.tsx
│   │   │   │   ├── LatestTicker.tsx
│   │   │   │   ├── LayoutWrapper.tsx
│   │   │   │   ├── LivingLogo.tsx
│   │   │   │   ├── LoadingSkeletons.tsx
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── LuxurySkeleton.tsx
│   │   │   │   ├── MouseGlow.tsx
│   │   │   │   ├── MyanmarFlowMap.tsx
│   │   │   │   ├── MyanmarIntelligencePanel.tsx
│   │   │   │   ├── NewsletterForm.tsx
│   │   │   │   ├── NotificationCenter.tsx
│   │   │   │   ├── PageBackground.tsx
│   │   │   │   ├── PDFExport.test.tsx
│   │   │   │   ├── PDFExport.tsx
│   │   │   │   ├── PostCard.tsx
│   │   │   │   ├── PremiumEffects.tsx
│   │   │   │   ├── PremiumInputs.tsx
│   │   │   │   ├── PremiumUIComponents.tsx
│   │   │   │   ├── RichTextEditor.test.tsx
│   │   │   │   ├── RichTextEditor.tsx
│   │   │   │   ├── Scene3D.tsx
│   │   │   │   ├── ScrollBackground.module.css
│   │   │   │   ├── ScrollBackground.tsx
│   │   │   │   ├── SEO.tsx
│   │   │   │   ├── ShareButtons.tsx
│   │   │   │   ├── SmoothScroll.tsx
│   │   │   │   ├── SocialShare.tsx
│   │   │   │   ├── StaticSphereBackground.tsx
│   │   │   │   ├── UserPreferences.tsx
│   │   │   │   ├── WorkflowCards.tsx
│   │   │   │   └── WorldTradeRoutesCanvas.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAdminAuth.ts
│   │   │   ├── lib/
│   │   │   │   ├── adminErrorHandler.ts
│   │   │   │   ├── adminSession.test.ts
│   │   │   │   ├── adminSession.ts
│   │   │   │   ├── dynamicImports.ts
│   │   │   │   ├── email.ts
│   │   │   │   ├── estimatorUtils.ts
│   │   │   │   ├── LanguageContext.tsx
│   │   │   │   ├── migrations.sql
│   │   │   │   ├── sanitize-html.test.ts
│   │   │   │   ├── sanitize-html.ts
│   │   │   │   ├── security-headers.test.ts
│   │   │   │   ├── stripe.test.ts
│   │   │   │   ├── stripe.ts
│   │   │   │   ├── supabase.ts
│   │   │   │   ├── useWindowSize.ts
│   │   │   │   ├── utils.ts
│   │   │   │   ├── validation.ts
│   │   │   │   └── xss-regression.test.ts
│   │   │   ├── styles/
│   │   │   │   ├── components.css
│   │   │   │   └── globals.css
│   │   │   └── test/
│   │   │       └── setup.ts
│   │   ├── .dockerignore
│   │   ├── .env.example
│   │   ├── .env.local.example
│   │   ├── .eslintrc.json
│   │   ├── .nvmrc
│   │   ├── Dockerfile
│   │   ├── middleware.ts
│   │   ├── next-env.d.ts
│   │   ├── next.config.ts
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   ├── postcss.config.mjs
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   ├── requirements-postgres.txt
│   └── requirements.txt
├── .env.example
├── .gitignore
├── CURRENT_STATE.md
├── PROJECT_OVERVIEW.md
├── README.md
├── render.yaml
├── ROADMAP.md
├── SECURITY.md
├── TOOL.md
└── UI_DESIGN_SYSTEM.md
```

## How to refresh this document

From the repository root, inspect the intended revision first:

```bash
git status --short --branch
git rev-parse HEAD
git ls-files | wc -l
```

Regenerate the tree from `git ls-files -z` (not a hand-maintained list), update the snapshot commit and date, review the diff, and commit the updated document. The generated tree is a point-in-time inventory; it does not imply that every component is deployed or active in production.
