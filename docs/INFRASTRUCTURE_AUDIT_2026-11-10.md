# Production and free-tier audit — 2026-11-10

**Overall state: DEPLOYED — NOT FULLY PRODUCTION-CERTIFIED.** Documentation-only audit. No paid plan was selected, no production secret was read or rotated, and no production data was changed.

## Free-tier inventory
| Provider | Observed plan/state | Cost-control notes |
|---|---|---|
| Render backend | Free Web Service; tracks main; auto-deploy enabled | Free services may sleep after inactivity. |
| Supabase production | Existing Free-tier project; ACTIVE_HEALTHY; PostgreSQL 17.6.1 | Leaked-password protection is Pro+ only. |
| Upstash Redis | Free; active; auto-upgrade disabled | TLS enabled. |
| Upstash QStash US/EU | Both Free | Prod Pack disabled; no schedules in either region. |
| Vercel | Latest production deployment READY | Project API reports live=false while the latest production deployment is READY and its alias responds. This discrepancy remains untouched under the existing Vercel change lock. |

No paid infrastructure upgrade, paid AI fallback, new worker, or additional provider resource was provisioned.

## Repository and deployment
- GitHub main HEAD: 4029acddbc3b67f78fa91d6a188e6218f74db3ed. PRs #206, #207, and #208 are merged.
- PR #208 CI #42779982393, CodeQL #42779982283, and Production CI/CD #42779982307 passed.
- Render service srv-d9172fe8bjmc739pd600 is Free, tracks main, auto-deploys, and its latest live deployment is dep-dbpbfnvg5rvs738gl7qg for backend commit de084fd8764ba78bcbe2b6897ed44703aefc13b4. PR #208 was frontend-only, so no backend redeploy was required.
- Live Render GET /health returned HTTP 200 with status=ok.
- Vercel production deployment dpl_73D5BkQXf24HY2TNaQ4CrxTTL93s is READY for main HEAD and has the logixa-flow.vercel.app alias.
- Live frontend GET / and GET /admin/login both returned HTTP 200.
- Frontend response headers observed include HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Permissions-Policy.
- Unauthenticated GET /api/admin/diagnostics and unsigned POST /api/admin/workflow/qstash-dispatch returned HTTP 401. This verifies rejection paths, not successful signed workflow delivery.

## Local verification
- Backend: Alembic upgrade to repository head 20261016_0015 on an isolated local SQLite CI database; pytest 294 passed, 5 skipped. No production migration was run.
- Frontend: Vitest 36 files / 87 tests passed.
- Frontend production build passed with Next.js 15.5.28.
- Full frontend npm audit: 0 vulnerabilities across development and production dependencies.
- Production-only frontend npm audit: 0 vulnerabilities.

## Supabase production security and data state
Read-only SQL on 2026-11-10:
- Alembic head 20261016_0015.
- Public tables 36; RLS enabled 36.
- Direct SELECT grants: anon=0, authenticated=0, service_role=36.
- workflows=0, workflow_nodes=0, workflow_runs=0, scheduled_workflow_jobs=0, stored_files=0.

Security Advisor returned 36 INFO findings for RLS-enabled tables without policies and one WARN for disabled leaked-password protection. The zero client-role SELECT grants match the backend/service-role-only access model; do not add broad policies or grants merely to clear informational lints.

Supabase official password-security documentation states leaked-password protection is available on Pro and above. It cannot be enabled while retaining Free. Free-plan compensating controls are to set a strong minimum password length (at least 8; 12 is a reasonable project policy) and require suitable character classes in Authentication → Sign In / Providers → Email. The connected Supabase actions cannot modify hosted Auth settings.

## QStash and workflow state
- QStash schedules are empty in both US and EU regions.
- Displayed November daily QStash request counters are zero in both regions; US DLQ count is zero.
- Production has no workflow definitions, nodes, runs, or scheduled jobs.
- No authenticated admin session or safe test workflow was available. Do not create guessed production rows or fabricated workflow IDs.
- Signed QStash dispatch → durable completion → duplicate suppression → retry/stale-claim recovery remains NOT VERIFIED.

## Remaining gates
1. Create a no-side-effect workflow through authenticated admin access; prove signed QStash delivery, durable completion, duplicate idempotency, retry, and stale-claim recovery with real run IDs.
2. Prove Agent → private Brain draft → explicit approval → publish/resume using an approved test item.
3. Complete an auditable SLO observation window with request/error/latency telemetry and verify alert delivery. A health response and configured 15-minute probe schedule do not establish an SLO pass.
4. Rehearse application rollback and managed Supabase Auth/Storage plus object-storage recovery against isolated targets.
5. Observe a full 24-hour scheduler boundary.
6. Review GitHub main-branch protection/required checks. The earlier audit found main unprotected; connected GitHub actions do not expose branch-protection mutation.
7. Review Cloudflare MFA enforcement and confirm owner-controlled recovery methods before enabling.
8. Newsletter delivery/provider failover remains unavailable until a suitable provider and credentials are deliberately configured. Keep unsupported billing/payment paths disabled.

## Audit boundary
Read-only provider inspection and safe HTTP checks only. No production environment variables or secret values were retrieved, changed, or rotated. No production rows, workflow records, content, storage objects, or schedules were created, updated, or deleted. No manual deployment, paid upgrade, rollback, or restore was triggered.
