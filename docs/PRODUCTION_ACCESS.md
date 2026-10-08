# Logixa Flow — Production Access Runbook

> Owner: Project / Engineering
> Update when: production authenticated testing, backup/restore drills, or operational access requirements change
> Do NOT put credentials, passwords, tokens, or database connection strings in this document.

## 1. Production authenticated access

The application uses Supabase Auth. The backend validates the Supabase access token against /auth/v1/user and requires app_metadata.role = admin.

For the release gate, use an existing dedicated production admin test account. Do not send its email/password or access token in chat.

### What you need to do

1. In GitHub → Settings → Environments → production → Secrets, provide:
   - PRODUCTION_ADMIN_EMAIL
   - PRODUCTION_ADMIN_PASSWORD
   - SUPABASE_URL
   - SUPABASE_PUBLISHABLE_KEY
   - PRODUCTION_API_URL — normally https://logixa-flow.onrender.com
2. In GitHub Actions, open Production Auth Smoke and click Run workflow manually.
3. After the release gate is complete, rotate/remove any temporary test credentials if they were created only for certification.

The workflow performs password login → obtain access token → GET /api/auth/me → assert role=admin → call a protected RAG admin endpoint. It does not print the password or access token.

### Important

Do not paste the password or bearer token into an issue, chat, commit, log, or documentation.

## 2. Backup / restore access

There are two separate goals:

- Backup availability: prove that production data can be backed up.
- Restore drill: prove that a backup can be restored into an isolated target without touching production.

Do not restore over the production database for the certification drill.

### What you need to do

1. Obtain the production Postgres connection string from the production Supabase project's Connect/database connection settings.
2. Put the production connection string into a GitHub production Environment Secret named SUPABASE_DB_URL.
3. Use the separate restore Supabase project/environment created for the drill and obtain its Postgres connection string.
4. Put that connection string into SUPABASE_RESTORE_DB_URL.
5. The two values must point to different databases/projects.
6. In GitHub Actions, open Production Backup Restore Gate and click Run workflow manually.

The workflow creates a logical production backup, restores it only into the isolated target, verifies migration/schema and critical Logixa Flow tables including RAG observability, then removes temporary backup material from the runner.

Supabase Storage objects are not included in a database logical backup, so this database restore drill does not replace the separate Storage-provider E2E gates.

## 3. If your current plan has no managed backup access

That is not a reason to fake a release pass. Use the logical-export route and keep managed-backup/PITR as an explicit plan limitation. The isolated restore drill provides recovery evidence for the database layer.

## 4. Certification rule

Production authentication is PENDING until the dedicated production admin account successfully completes the live workflow.

Backup/restore is PENDING until an isolated restore has been completed and critical data integrity has been checked.

No production restore operation should be performed as part of this drill.
