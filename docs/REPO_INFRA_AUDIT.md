# Logixa Flow — Repository and Infrastructure Audit

> Owner: Engineering / Release
> Status: AUDITED — RELEASE NOT YET CERTIFIED
> Last Updated: 2026-10-09

## Scope

Read-only cross-check of the current main tree, repository CI/security checks, Render production state, Vercel production state, and live Supabase production state. Observed state is kept separate from pending live release gates.

## Findings

### Repository
- main currently points to commit 1b99ee45604a1bdac575f4c2b18c197901cff1f7.
- Canonical root Markdown set is clean: only README.md, PROJECT_OVERVIEW.md, CURRENT_STATE.md, ROADMAP.md, UI_DESIGN_SYSTEM.md, TOOL.md, and SECURITY.md exist at repository root.
- Additional Markdown documentation is under docs/; no new root-level documentation sprawl was found.
- Repository migration head is 20261008_0012.
- Application hardening commit 115482a27a9c7d56294c8fe09940190555a8d7a1 has successful backend, agents, frontend, security, and CodeQL check runs. CI #450 / CodeQL #197 are the latest confirmed application validation.
- package.json declares Next.js ^15.5.27. eslint-config-next remains intentionally on ^15.5.19 and should not be represented as upgraded to 15.5.27.

### Render
- Production service Logixa-Flow- is a single Free Docker Web Service on main, auto-deploy enabled, with health path /health, one instance, Oregon region.
- Latest live deploy is dep-db3svg2vcj2c73fo003g at commit 115482a27a9c7d56294c8fe09940190555a8d7a1.
- The latest application deploy is LIVE; older failed deploys are deactivated history, not the active release.
- Render metrics currently show no HTTP request series in the available window and no current application log errors were observed in the queried interval. CPU/memory telemetry exists. This is an observation-window limitation, not proof of a 30-day SLO.
- Render production remains configured for CELERY_ENABLED=false; QStash is the external delivery mechanism for the current Free workflow path.

### Vercel
- Production project logixa-flow exists with verified logixa-flow.vercel.app production domain.
- Latest inspected production deployment is READY and serves HTTP 200 through the Vercel fetch surface.
- That READY deployment is based on commit 684d772b15e88fe13721b2933eec8661b8a65469, not the current documentation-only main head.
- No production runtime errors were found for the last 7 days; the most recent 50-minute production warning/error log query returned no entries.
- The GitHub Vercel check for the current documentation-only head is FAILING because Vercel reports the Hobby build rate limit. This is a deployment/integration-capacity issue, not evidence that the currently READY deployment is broken.
- No Vercel deployment exists for the current documentation-only main head. Application code is unchanged, but the Vercel integration is not fully green on the current GitHub head.

### Supabase
- Production migration history ends at 20261008_0012_rag_observability.
- Production alembic_version is 20261008_0012.
- rag_observability_events and scheduled_workflow_jobs exist.
- No queued/running/paused workflow runs or non-terminal scheduled jobs were present at audit time.
- rag_observability_events currently contains zero rows; durable RAG telemetry is deployed but no production RAG event has been observed in the queried database yet.
- Security advisors show 34 INFO findings for RLS-enabled tables without policies and one WARN for disabled leaked-password protection. A direct SQL audit confirmed every public table has RLS enabled and no public-table SELECT grant is present for anon/authenticated; service-role-only access is therefore the intended current model. The password-protection WARN remains a documented platform/plan limitation and is not marked fixed.
- Performance advisors show 96 unused-index INFO findings. These are workload-review candidates, not automatic defects.

## Known intentional incomplete capability

- Newsletter and transactional test-send endpoints intentionally return HTTP 501 until a real transactional email provider is connected. This is a documented release gate, not an unexpected runtime regression.

## Concrete issues found

1. Vercel integration check is red on the current docs-only head because of Hobby build-rate limiting.
2. Several canonical docs had stale migration/telemetry statements; those were reconciled during this audit pass.
3. Live release evidence remains incomplete for provider E2E, authenticated production smoke, workflow recovery, RAG/AI publishing, scheduled execution, newsletter, backup/restore, rollback/DR, and SLO/error-budget observation.

## Evidence boundary

A READY deployment, green repository CI, configured credentials, or a clean short log window does not substitute for the remaining production release gates.