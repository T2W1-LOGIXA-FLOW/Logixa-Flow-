# Logixa Flow — Security Policy

> Owner: Security / Engineering
> Update when: threat model, authorization boundaries, secrets, dependency policy, or incident procedures change
> Last Updated: 2026-10-08
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

Schema changes use Alembic. Repository migration head is 20261007_0011; live production head is 20261007_0011, verified 2026-10-08 from the connected Supabase migration history.

## Service role and secrets

Service-role keys, provider keys, QStash tokens/signing keys, database credentials, JWT/API secrets, and other private values remain backend/deployment-side. Never commit or paste secrets into source or documentation.

## Frontend/backend boundary

Frontend code uses public configuration only. Server-side provider credentials and privileged database credentials remain on the backend.

## Rate limits and CORS

Backend rate limiting and configured CORS remain part of the API security boundary. Changes must be validated against the actual backend configuration rather than copied from generic templates.

## PII and logging

Sanitize provider/database errors before returning or logging them. Preserve correlation IDs where useful for investigation, but do not log secrets or unnecessary sensitive payloads.

## Dependency security

Dependabot and CI security checks are part of the repository security process. Major framework upgrades require compatibility review rather than automatic acceptance. Runtime dependencies remain subject to high/critical security gates as configured by CI.

## AI safety

AI output is reviewable intelligence, not automatically trusted truth. Publication-sensitive AI output requires the intended human approval path. Provider credentials remain server-side. Configured provider credentials do not prove live provider health.

## Vercel operational lock

Vercel override configuration was intentionally removed. If Vercel is disabled or paused, do not restore Vercel-specific build/install/output overrides or re-enable the deployment without explicit project-owner authorization.

## Incident handling

Preserve affected run/session identifiers, timestamps, correlation IDs, sanitized logs, and provider response classes. Do not place credentials or raw secrets in incidents. Escalate authorization, secret exposure, data-access, or production integrity issues before applying destructive changes.

## Deferred risks

Live provider/storage verification, live production migration state, durable RAG observability/feedback, broader retention controls, and other items listed in CURRENT_STATE.md and ROADMAP.md remain explicit verification or future-work areas.

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
