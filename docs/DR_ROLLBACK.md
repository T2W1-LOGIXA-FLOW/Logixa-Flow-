# Logixa Flow — Disaster Recovery and Rollback

> Owner: Engineering / Operations
> Status: PRE-STAGED
> Last Updated: 2026-10-11

## Purpose

This document defines the evidence required before release freeze for database recovery, provider recovery, application rollback, and data-integrity verification.

## Required drills

1. Record the exact repository release SHA and live migration head.
2. Create or verify a restorable database backup/snapshot using the production control plane.
3. Restore into an isolated target; verify schema head, row counts, workflow terminal states, and critical publication/session records.
4. Verify object-storage recovery for the configured providers without exposing credentials.
5. Rehearse application rollback to the previous known-good release.
6. Re-run authentication, workflow, RAG, and publication smoke checks after rollback.
7. Reconcile data-integrity differences and document the result before declaring recovery successful.

## Current state

The isolated public-schema logical backup/restore drill passed on 2026-10-09 (run #6): restored application schema/data, migration head `20261008_0012`, critical tables, and RAG observability count were checked in the isolated restore project. This does **not** verify managed Supabase Auth/Storage, object-storage disaster recovery, point-in-time recovery, or application rollback. Deterministic workflow recovery tests exist, but live retry/stale-claim/failure recovery and a production rollback rehearsal remain pending. Do not restore over production as part of this drill.

## Controlled rehearsal procedure

1. Obtain an approved maintenance window and name the incident commander and operator. Do not run a production rollback as a routine CI step.
2. Record the live Render deployment ID, repository SHA, current Alembic head, current RAG embedding version/mode, and read-only counts for critical tables. Record current public post slugs and workflow terminal-state counts without exporting private draft content.
3. Verify the latest backup artifact and restore it only to the dedicated isolated recovery project. Never reset or restore the production schema as part of this rehearsal.
4. Roll back the application using the hosting control plane to the previously recorded known-good deployment. Do not reverse database migrations automatically. If the prior application version is incompatible with the current schema or RAG embedding version, stop and use a forward-fix plan instead.
5. Run the authenticated API smoke and read-only Admin UI browser smoke. Verify `/health`, `/api/auth/me`, Brain queue GET, RAG status/search, and workflow status endpoints; do not publish or mutate existing Brain records during smoke checks.
6. Compare critical table counts, migration head, public post slugs, and workflow terminal states against the pre-drill baseline. Investigate every unexplained difference.
7. Restore the intended release only after approval; record deployment IDs, timestamps, evidence links, recovery duration, data-loss estimate, and any failed checks.

## Exit evidence

A recovery drill is VERIFIED only when the restored system is independently checked and the evidence records the release SHA, migration head, timestamps, test results, and any data-integrity exceptions.
