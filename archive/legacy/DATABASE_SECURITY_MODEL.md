<!-- Archived from docs/DATABASE_SECURITY_MODEL.md during the 2026-10-08 documentation migration. -->

# Database Security Model

## Current production access model

Logixa Flow uses PostgreSQL as a backend-owned data store. The frontend does not receive a database service-role credential and should not directly read or write application tables.

The Supabase baseline migration enables Row Level Security on application tables and revokes table/sequence privileges from `anon` and `authenticated`, while granting the backend service role the required database privileges. Therefore, a table being `RLS enabled` with no client policy is intentional under the current backend-only access model; it prevents direct client access rather than creating an accidental public table.

## Why policies are not added to all tables

Adding broad `SELECT/INSERT/UPDATE/DELETE` policies to every table would weaken the current boundary and could expose internal workflow, AI memory, audit, cost, and configuration data to browser sessions. Policies should be added only if a table is deliberately exposed through Supabase client access.

Before any policy is introduced, map:

- owning identity (`auth.uid()` or another tenant key)
- read/write operations required by the frontend
- public versus authenticated visibility
- admin-only data
- service-only data
- storage/object ownership
- foreign-key ownership propagation
- insert/update/delete checks

## Backend invariant

Admin APIs authenticate with Supabase Auth and perform application database work server-side. Provider secrets and service credentials remain server-side. RLS is a defense-in-depth database boundary, not a substitute for API authorization.

## Migration invariant

Schema changes must be represented by Alembic migrations. The application verifies that the database is at the migration head during startup and does not silently mutate production schema.

## Future direct-client access

If the frontend later needs direct Supabase access for a specific table, create a narrowly scoped migration with explicit policies and test the `anon` and `authenticated` paths separately. Never solve an access error by granting broad privileges or disabling RLS.

## Verification status

- RLS baseline: implemented.
- Direct client table grants: revoked by migration.
- Backend authorization: enforced at API boundary.
- Per-table client policies: intentionally absent until a direct-client access requirement exists.
- Full authenticated production E2E: reserved for the final verification phase.
