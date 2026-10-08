# TOOL.md — Logixa Flow Operational Agent Guide

> Owner: Project / Engineering
> Update when: working protocol, phase gates, documentation routing, tools, or definition of done changes
> Last Updated: 2026-10-08
> Do NOT put here: domain implementation detail that belongs in docs/.

## 1. Read order

1. README.md
2. PROJECT_OVERVIEW.md
3. CURRENT_STATE.md
4. ROADMAP.md
5. UI_DESIGN_SYSTEM.md when UI work is involved
6. TOOL.md
7. SECURITY.md for security-sensitive work
8. Relevant docs/* domain document

Before changing infrastructure or production schema, inspect current live state. Do not invent provider secrets, connection strings, deployment identifiers, or verification evidence.

## 2. Git workflow

Work directly on main unless the project owner explicitly authorizes another branch. For routine remediation, do not create a feature branch. Keep changes atomic enough to review and run git diff --check before completion.

## 3. Phase completion protocol

1. Inspect current repository and relevant live state.
2. Define the exact scope and acceptance criteria.
3. Make the smallest architecture-preserving change.
4. Run relevant tests/checks.
5. Inspect the resulting diff and links.
6. Verify status claims against evidence.
7. Update documentation immediately.
8. Record remaining VERIFY/PENDING/DEFERRED items in CURRENT_STATE or ROADMAP.

## 4. Documentation Update Protocol

### Trigger table

| Change type | Canonical update |
| --- | --- |
| Project identity/high-level architecture | README.md / PROJECT_OVERVIEW.md |
| Current status, release gate, or live verification result | CURRENT_STATE.md |
| Planned work or acceptance criteria | ROADMAP.md |
| UI token/component/accessibility rule | UI_DESIGN_SYSTEM.md |
| Working process, git, CI, phase, evidence rule | TOOL.md |
| Threat model, authz, secrets, security boundary | SECURITY.md |
| Architecture decision | docs/ARCHITECTURE.md |
| Development/setup/CI detail | docs/DEVELOPMENT.md |
| Test strategy/evidence | docs/TESTING.md |
| Deployment/environment topology | docs/DEPLOYMENT.md |
| Operations/recovery/monitoring/runbook | docs/OPERATIONS.md or docs/TROUBLESHOOTING.md |
| Database/schema/migration/RLS | docs/DATABASE.md |
| API route/contract | docs/API.md |
| AI/provider/RAG behavior | docs/AI_RAG.md |
| Storage routing/provider behavior | docs/STORAGE.md |

### Phase completion checklist

- Update the owning canonical document.
- Update CURRENT_STATE.md when status changes.
- Update ROADMAP.md when a plan/gate changes.
- Add a direct evidence link/log/date for every VERIFIED claim.
- Keep VERIFY when the required evidence cannot be obtained; record the exact blocker.
- Remove stale duplicate ownership from source documents before archiving them.
- Fix links to canonical destinations.

### Session start

Read the canonical order above. Check git status, current branch, recent commit context, and the relevant domain documents before editing.

### Session end

Run applicable tests/checks, inspect git diff, confirm documentation ownership, confirm no stale claims were introduced, and record remaining VERIFY/PENDING/DEFERRED work.

### Doc drift rule

If code/configuration changes invalidate a documentation statement, the documentation is stale immediately. Correct it in the same change cycle. Do not preserve a known false status claim for convenience.

## 5. Tools matrix

| Tool/work | Primary source |
| --- | --- |
| Repository files/history | GitHub |
| Code/config facts | Repository source/config |
| Live Supabase database/migration state | Supabase project tooling |
| Live deployment/runtime | Appropriate provider/API tooling |
| DNS/email authentication | DNS Doctor |
| UI design implementation | Figma when explicitly used |
| Deployment/runtime | Render/Vercel/provider tooling |

Never use a secondary document as proof against current code/configuration when direct repository evidence is available.

## 6. Definition of Done

A change is done only when:
- Code/configuration is correct.
- Relevant tests/checks pass.
- Diff is clean.
- Canonical documentation is updated.
- Status labels reflect evidence.
- Every VERIFIED claim has direct evidence with date/link/log.
- No secrets are committed.
- No duplicate canonical document is created.
- Remaining work is explicitly recorded.

## 7. Evidence rules

Use these distinctions everywhere:
- DONE = code/implementation exists.
- VERIFIED = evidence exists for the stated condition.
- PENDING = intended work not yet complete.
- BLOCKED = cannot proceed because a specific blocker exists.
- DEFERRED = intentionally postponed.
- NEXT = immediate follow-up action.
- VERIFY = evidence is required before claiming truth.

Keep repository migration head separate from live production head. Keep implemented separate from configured, enabled, and live-tested. Never claim provider health from credentials alone. Never claim a live integration solely from unit tests. When live infrastructure tooling is available, use it and record the exact observation date and evidence reference.

## Current deployment architecture

Render Free uses one Web Service. QStash provides durable delivery/delay/retry for the current path. PostgreSQL is durable workflow/run state. CELERY_ENABLED=false is intentional. Celery/Redis are optional only when explicitly enabled. A Render Background Worker is not a current prerequisite.

## Current storage routing

Images <=10 MB: Cloudinary. Documents <=50 MB: Supabase Storage. Files >50 MB and <=5 GB: Backblaze B2. Export/backup artifacts: Google Drive. Real provider E2E remains separate from repository verification.

## Release gates

Do not remove the local recovery path until live evidence exists for signed QStash delivery, canonical workflow completion, duplicate-delivery protection, retry/claim recovery, stale-claim recovery, monitoring evidence, storage-provider E2E, Google Drive E2E, and production authentication/API smoke tests.

## Final decision rule

Preserve the PostgreSQL-backed recovery path and QStash dispatch until the complete signed QStash → workflow execution and recovery scenarios are verified in production.
