# Logixa Flow — Production Access Runbook

> Owner: Project / Engineering
> Update when: production authenticated testing, backup/restore drills, or operational access requirements change
> Do NOT put credentials, passwords, tokens, or database connection strings in this document.

## 1. Production authenticated access

The application uses Supabase Auth. The backend validates the Supabase access token against /auth/v1/user and requires app_metadata.role = admin.

For the release gate, use a dedicated temporary production test-admin account. Do not send its email/password or access token in chat.

### What you need to do

1. In the production Supabase project, create a dedicated test user, for example release-gate-admin@your-domain.
2. Set that user's password to a unique temporary value.
3. Ensure the user's app_metadata contains {"role":"admin"}.
4. In GitHub → Settings → Environments → production → Secrets, add:
   - PRODUCTION_TEST_ADMIN_EMAIL
   - PRODUCTION_TEST_ADMIN_PASSWORD
   - SUPABASE_PUBLISHABLE_KEY
   - PRODUCTION_API_URL — normally https://logixa-flow.onrender.com
5. Run the repository's manual production-auth workflow from GitHub Actions.
6. After the release gate is complete, delete or disable the temporary test-admin account and remove the two test-admin secrets.

The workflow performs password login → obtain access token → GET /api/auth/me → assert role=admin → call a protected RAG admin endpoint. It does not print the password or access token.

### Important

Do not use the real owner account for this test. Do not paste the password or bearer token into an issue, chat, commit, log, or documentation.

## 2. Backup / restore access

There are two separate goals:

- Backup availability: prove that production data can be backed up.
- Restore drill: prove that a backup can be restored into an isolated target without touching production.

Do not restore over the production database for the certification drill.

### What you need to do

1. In Supabase Dashboard, open the production project and go to Database → Backups.
2. Confirm whether managed backups are available for the current plan. Supabase documents automatic daily backups for Pro, Team, and Enterprise; Free projects should maintain logical exports/off-site backups.
3. For a controlled logical backup, open Connect, obtain the production Postgres connection string, and use the database password. Supabase recommends the direct connection for pg_dump/backup/restore operations.
4. Put the production connection string into a GitHub production Environment Secret named SUPABASE_DB_URL. Never paste it into chat.
5. For a true hosted restore drill, create or select an isolated target Supabase project/environment and obtain its connection string. Put it into SUPABASE_RESTORE_DB_URL. The target must not be production.
6. Tell me only that the two GitHub Environment Secrets are ready. Do not send their values here.

### What I will do after that

I can wire and run a non-destructive backup/restore gate that:

1. creates a logical production backup;
2. restores it only into the isolated target;
3. verifies schema/migration state and critical Logixa Flow tables;
4. verifies workflow/session/RAG observability data where present;
5. records pass/fail evidence without storing the database dump in the repository;
6. cleans up temporary artifacts.

Supabase's restore documentation recommends restoring logical backups into a separately created project and warns that Storage objects are not included in database backups. Therefore the database restore drill does not replace the separate Storage-provider E2E gates.

## 3. If your current plan has no managed backup access

That is not a reason to fake a release pass. Use the logical-export route above and keep managed-backup/PITR as an explicit plan limitation. Supabase notes that PITR is a paid add-on and that Free projects should maintain regular off-site logical exports.

## 4. Certification rule

Production authentication is PENDING until the dedicated test account successfully completes the live workflow.

Backup/restore is PENDING until an isolated restore has been completed and critical data integrity has been checked.

No production restore operation should be performed as part of this drill.
