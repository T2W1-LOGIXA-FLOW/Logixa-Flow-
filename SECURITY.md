# Logixa Flow — Security Policy

> Owner: Security / Engineering
> Update when: threat model, authorization boundaries, secrets, dependency policy, or incident procedures change
> Last Updated: 2026-10-15
> Do NOT put here: release status details that belong in CURRENT_STATE.md or domain implementation details that belong in docs/.

## Scope

This policy covers the Logixa Flow frontend, FastAPI backend, PostgreSQL/Supabase data layer, AI/RAG integrations, storage providers, workflow delivery, CI/CD, and operational access boundaries.

## Threat model

Primary concerns include unauthorized admin/API access, secret exposure, unsafe AI output, cross-owner session access, storage misuse, provider error leakage, insecure database grants/RLS, and supply-chain/dependency risk.

## Authentication and authorization

Protected admin routes use backend authentication/authorization dependencies. Authorization is enforced server-side. Frontend visibility is not a security boundary.

Public AI and admin AI are independently gated. Backend AI gates are authoritative.

## Admin boundaries

Admin chat sessions are owner-scoped. Foreign, inactive, and ownerless sessions must not expose state. Ownership transfer and cleanup remain server-authorized operations.

## Database and RLS

The backend owns application database access. The frontend must not receive service-role credentials. RLS is defense-in-depth and does not replace API authorization. Avoid broad grants or permissive policies solely to silence advisor output.

Schema changes use Alembic. Repository and live production migration head is `20261011_0013`; production parity was independently verified on 2026-10-12. Production Supabase security advisors currently report 34 informational `RLS enabled, no policy` findings across internal application tables and one warning that leaked-password protection is disabled. A read-only grant audit found no table privileges granted to `anon`, `authenticated`, or `PUBLIC`; do not add broad policies/grants merely to silence the informational findings. Leaked-password protection is disabled on the current project plan; see Operational security exceptions below. Do not report it as enabled.

## Service role and secrets

Service-role keys, provider keys, QStash tokens/signing keys, database credentials, JWT/API secrets, and other private values remain backend/deployment-side. Never commit or paste secrets into source or documentation.

## Frontend/backend boundary

Frontend code uses public configuration only. Server-side provider credentials and privileged database credentials remain on the backend.

## Rate limits and CORS

Backend rate limiting and configured CORS remain part of the API security boundary. Changes must be validated against the actual backend configuration rather than copied from generic templates.

## PII and logging

Sanitize provider/database errors before returning or logging them. Preserve correlation IDs where useful for investigation, but do not log secrets or unnecessary sensitive payloads.

## Dependency security

Dependabot and CI security checks are part of the repository security process. Major framework upgrades require compatibility review rather than automatic acceptance. Next.js is aligned to the patched 15.5.27 line. After PR #114 merged as `d943cb66390f324eaee39cd3bf9d0c3a993bef3c`, the latest recorded full dev-inclusive `npm audit` has 7 high development-tooling findings and 0 moderate/critical findings; `npm audit --omit=dev` has 0 findings. The remaining high findings need a compatible Tailwind 4 / Next ESLint toolchain decision. A local `pip-audit -r apps/web-platform/backend/requirements.txt` run found no known backend dependency vulnerabilities; GitHub CI security validation passed in [CI #38504093229](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38504093229), and CodeQL passed in [#38504093130](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38504093130). Do not repeat the older 9-finding snapshot as current.

## AI safety

AI output is reviewable intelligence, not automatically trusted truth. Publication-sensitive AI output requires the intended human approval path. Provider credentials remain server-side. Configured provider credentials do not prove live provider health.

## Vercel operational lock

Vercel override configuration was intentionally removed. If Vercel is disabled or paused, do not restore Vercel-specific build/install/output overrides or re-enable the deployment without explicit project-owner authorization.

## Incident handling

Preserve affected run/session identifiers, timestamps, correlation IDs, sanitized logs, and provider response classes. Do not place credentials or raw secrets in incidents. Escalate authorization, secret exposure, data-access, or production integrity issues before applying destructive changes.

## Operational security exceptions

Supabase Auth leaked-password protection is currently unavailable on the project's plan and is treated as an explicit plan limitation rather than a falsely claimed control. Compensating controls are strong admin authorization, dedicated production test accounts for release gates, backend token validation, and short-lived operational test credentials.

Production authenticated access and backup/restore remain manual release gates. Database restore drills must target an isolated environment; never restore over production as part of certification.

## Deferred risks

Live provider/storage verification, full durable RAG operations, broader retention controls, dependency findings noted above, and other items listed in CURRENT_STATE.md and ROADMAP.md remain explicit verification or future-work areas.

## Verification checklist

- Backend authorization remains authoritative.
- Service-role and provider secrets are backend-side.
- RLS/grants match the intended backend access model.
- Alembic repository head and live head are reported separately.
- Public AI gate is enforced server-side.
- Provider health is not inferred from credentials alone.
- QStash signing is verified before trusting delivery.
- Storage provider E2E is tested with real infrastructure before release claims.
- Logs do not expose secrets.
- Vercel remains locked unless explicitly authorized.

## Provider security review — 2026-10-15

The live provider audit in [docs/INFRASTRUCTURE_AUDIT_2026-10-15.md](docs/INFRASTRUCTURE_AUDIT_2026-10-15.md) found Cloudflare account `enforce_twofactor=false`, Supabase leaked-password protection disabled, and 34 Supabase tables with RLS enabled but no policies (INFO). Existing database notes record a backend-only access model and a prior read-only scan without `anon`, `authenticated`, or `PUBLIC` table grants. These findings require explicit access-model review; do not respond by broadly granting table access or creating generic permissive policies. Enable MFA only through owner-controlled account settings after recovery methods are confirmed. Supabase's password-protection limitation should be revisited if the plan changes. No account security setting or database policy was changed during this audit.
