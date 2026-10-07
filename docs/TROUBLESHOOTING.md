# Logixa Flow — Troubleshooting

> Owner: Operations / Engineering
> Update when: failure modes, diagnostics, or recovery procedures change
> Last Updated: 2026-10-08
> Do NOT put here: credentials or unverified production claims.

## Database behind repository head

Inspect the live database revision and compare it with repository head 20261007_0011. If behind, follow controlled Alembic deployment. Do not claim live head merely because the repository contains the migration.

## QStash/workflow failure

Check signing configuration, destination URL, dispatch response, canonical workflow logs, PostgreSQL run state, retry/claim/recovery state, and duplicate-delivery behavior. Do not replace the canonical workflow path with a second worker architecture merely because a delivery attempt failed.

## RAG failure

Use correlation ID and sanitized error classification. Distinguish validation, transient, embedding, database, search/ranking, timeout, and unknown failures where exposed by the current API.

## Provider failure

Configured credentials are not proof of health. Run the relevant provider E2E test and record evidence separately.

## Frontend accessibility/interaction

Check existing keyboard navigation, focus management, live-region, reduced-motion, and high-contrast helpers before adding a new accessibility mechanism.

## Vercel

If the operational lock is active, do not restore vercel.json overrides or re-enable Vercel without explicit authorization.
