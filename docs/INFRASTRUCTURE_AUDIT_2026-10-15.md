# Logixa Flow — Repository and Infrastructure Audit

> Audit date: 2026-10-15
> Scope: repository documentation and configuration references; connected GitHub, Vercel, Render, Supabase, and Cloudflare account/resource APIs.
> Mode: read-only infrastructure inspection; documentation-only repository changes.
> Overall release: **PENDING — NOT RELEASE-CERTIFIED**.

## Executive findings

- GitHub repository: `T2W1-LOGIXA-FLOW/Logixa-Flow-`, default branch `main`. Repository documentation and release evidence already identify the latest production release gates; this audit adds fresh provider-side observations rather than treating prior Markdown as live truth.
- Render: one non-suspended Free Docker Web Service, `Logixa-Flow-`, at https://logixa-flow.onrender.com. Root directory is `web-platform/backend`, health check is `/health`, branch is `main`, and auto-deploy on commit is enabled. The latest listed deploy is **live** for commit `8a1b5ad4bfab817e5e4a56d8cec22b1b035e4215` (opt-in Sentry error tracking). No Render Postgres or Key Value resource was returned in the workspace inventory; the app's durable database is Supabase. The service has one instance and allows inbound traffic from `0.0.0.0/0`; verify application-layer auth and rate limiting for every non-public route.
- Vercel: project `logixa-flow` exists, framework Next.js, Node.js 24.x. The latest main-branch production deployment returned **READY** for commit `8a1b5ad4bfab817e5e4a56d8cec22b1b035e4215`. The project API reports `live=false`, while the project's `latestDeployment` points at an ERROR deployment associated with a Dependabot branch. These are different fields/deployment scopes; do not infer a production outage or promote/repair Vercel from the ERROR preview alone. Existing Vercel operational lock remains in force; no configuration or deployment mutation was made.
- Supabase production project `ephrnmigiwjhdjksreos` (`Logixa-Flow-`) is `ACTIVE_HEALTHY`, region `ap-southeast-1`, PostgreSQL 17.6.1. Live `public.alembic_version` is `20261011_0013`, consistent with the current application migration head in repository documentation. Read-only counts: 34 public tables, 8 `rag_observability_events`, and **0 workflows, 0 workflow nodes, 0 workflow runs, 0 scheduled workflow jobs**. This empty workflow inventory prevents live QStash execution/retry/idempotency/recovery from being certified.
- Supabase restore target `bxvykaijlrqjvlhtumpg` (`logixa-flow-restore-drill`) is `ACTIVE_HEALTHY`, also in `ap-southeast-1`. Its project API is healthy, but the Supabase migration-list API returns no entries for it. This may reflect use of Alembic rather than Supabase CLI migration tracking; it is not by itself proof that the previously documented restore drill failed. Continue to use the successful, evidence-linked current-schema restore gate for the application schema and separately verify managed Auth/Storage recovery.
- Supabase security advisors currently report 34 RLS-enabled tables with no policies (INFO) and leaked-password protection disabled (WARN). The project documentation records a backend-only database access model and an earlier read-only scan found no `anon`, `authenticated`, or `PUBLIC` table grants. Do not mass-create policies or broaden grants without reviewing that access model. The password-protection finding is documented as a current Free-plan limitation; re-evaluate if the plan changes.
- Supabase performance advisors report 82 unused-index findings (INFO). This is an advisory, not authorization to drop indexes; review query patterns and production workload before any schema change.
- Cloudflare account API access is valid. Account-level inventory returned **0 zones, 0 Workers scripts, 0 Pages projects, 0 KV namespaces, 0 D1 databases, and 0 Queues**. The R2 list endpoint reports that R2 must be enabled in the dashboard, so R2 bucket inventory could not be inspected and must not be represented as an empty bucket list. Cloudflare account settings report `enforce_twofactor=false`; enable/enforce MFA after owner review. No Cloudflare resources or account settings were changed.
- GitHub/CI evidence and provider resource status do not equal end-to-end release certification. Release remains pending until the outstanding production gates below are closed.

## Verified provider snapshot

| Provider | Observed state | Required interpretation |
| --- | --- | --- |
| GitHub | Repository reachable; `main` is default branch | Inspect live Actions and code for each claim; repo visibility does not prove CI freshness |
| Render | One Free web service, latest deploy live | `/health` and a live deploy do not certify workflow completion or SLO |
| Vercel | Main production deployment READY; project API says `live=false`; latestDeployment field points to an ERROR Dependabot deployment | Keep Vercel locked; investigate deployment aliases/live flag only with explicit owner approval |
| Supabase production | ACTIVE_HEALTHY; Alembic head `20261011_0013` | Database is reachable, but live workflow tables are empty |
| Supabase restore target | ACTIVE_HEALTHY | Keep managed Auth/Storage and object-storage restore as separate gates |
| Cloudflare | API authenticated; listed compute/storage resources absent | DNS zone, Workers, Pages, KV, D1 and Queue inventory is empty; R2 is not enabled/inspectable |
| Security posture | Supabase RLS/policy and leaked-password warnings; Cloudflare MFA enforcement disabled | Review intended backend-only access; owner-approved account security hardening required |

## Remaining work — ordered checklist

### P0 — required before release certification

- [ ] Create a safe, no-side-effect workflow definition through authenticated admin access and verify durable QStash dispatch, signature validation, completion state, duplicate-delivery idempotency, retry behavior, stale-claim reclamation, and exception recovery in production. Capture run IDs, durable database outcomes, and sanitized logs.
- [ ] Verify Agent → private Brain draft → explicit approval → Publish/resume end-to-end in production. Confirm pending/private drafts remain private unless explicitly approved.
- [ ] Close the full SLO observation window using reliable request/latency/error telemetry. Render-native HTTP metrics previously returned no datapoints; missing metrics are not evidence of zero traffic or a passing SLO. Validate the alert path and document thresholds/error budget.
- [ ] Run a controlled production rollback/DR rehearsal with a reviewed recovery point and recorded recovery time; do not run a destructive restore against production.
- [ ] Verify managed Supabase Auth and Storage recovery plus external object-storage recovery (Cloudinary, private B2/S3, Google Drive as applicable). Existing application-schema restore evidence does not cover these systems.
- [ ] Observe the scheduler across a real 24-hour boundary after the cooldown fix and confirm no duplicate preview creation after restarts.
- [ ] Configure a transactional email provider and credentials only after owner approval; verify newsletter delivery and provider-failure behavior. Until then, newsletter endpoints returning HTTP 501 are expected and email delivery is not certified.

### P1 — security, reliability, and cost

- [ ] Review Cloudflare account MFA enforcement (`enforce_twofactor=false`) and enable it through the owner-controlled dashboard after confirming recovery methods.
- [ ] Review all 34 Supabase RLS-enabled/no-policy findings against the backend-only grant model; record why each table is intentionally inaccessible to client roles or add narrowly scoped policies if the model requires them. Do not grant broad access to clear the advisor.
- [ ] Decide how to handle Supabase leaked-password protection given the current plan; re-check if a plan change makes the setting available.
- [ ] Review the 82 unused-index advisories against actual query plans and usage windows before deciding whether to retain or remove indexes.
- [ ] Resolve the 7 high dev-tooling npm audit findings with a compatible Tailwind 4 / Next ESLint toolchain plan; production-only npm audit currently has 0 findings. Do not combine risky major upgrades without full CI/build validation.
- [ ] Diagnose the Vercel project `live=false` field and ERROR latestDeployment versus READY main production deployment. Preserve the Vercel operational lock; make no changes until the owner explicitly authorizes remediation.
- [ ] Inspect Cloudflare R2 enablement and buckets in the dashboard if R2 is intended to be part of this product. The API could not list buckets because R2 is not enabled for the account.
- [ ] Review Render inbound exposure and ensure all non-public application routes enforce authorization, request validation, and appropriate rate limits.

### P2 — operational completeness

- [ ] Re-run GitHub CI and CodeQL on the current main HEAD after the documentation-only audit commit(s); docs-only paths may be excluded by workflow policy, so record the exact checks that did run.
- [ ] Reconcile provider inventory with `docs/TOOLS_AND_LLM_INVENTORY.md` and environment variable names without printing secret values. Presence of a credential is not proof of validity or provider health.
- [ ] Keep a dated, evidence-linked release checklist; update `CURRENT_STATE.md`, `ROADMAP.md`, `docs/RELEASE_CERTIFICATION.md`, and `docs/RELEASE_EVIDENCE.md` whenever a gate changes.
- [ ] Confirm Vercel domain/alias routing and SSO/protection expectations in the dashboard without bypassing the existing lock.
- [ ] Keep the Render Free architecture as one Web Service with QStash delivery and PostgreSQL durable state unless an explicit design/cost decision changes it. A separate Render Background Worker is not currently required by the documented architecture.

## Scope limitations

This audit used connected provider APIs and read-only database queries. It did not reveal or print secret values, change runtime configuration, run destructive migrations, create production workflows, enable account products, alter MFA, promote Vercel deployments, or modify data. Provider inventory cannot establish application-level authorization correctness; that requires code review and tests. A missing resource in the connected account may also mean the service is not intended to be used, so confirm architecture intent before provisioning anything.
