# Repository Structure — Logixa Flow

```text
Logixa-Flow-/
├── apps/
│   └── web-platform/
│       ├── frontend/                   # Next.js / React web application
│       └── backend/                    # FastAPI API, migrations, services and tests
│           └── agents/                 # Secondary collector → writer → manager → publisher pipeline
├── docs/                               # Current architecture, API, operations and release docs
├── scripts/                            # Repository tooling and verification
├── .github/workflows/                  # CI, security and deployment automation
└── archive/legacy/                     # Historical material; not active runtime code
```

## Placement rules

- Keep frontend code in `apps/web-platform/frontend/` and backend-owned code in `apps/web-platform/backend/`.
- `apps/web-platform/backend/agents/` is a backend service boundary, not a second web application and not the canonical workflow engine.
- Logixa Flow does not currently have an `apps/mobile/` surface. Add one only when mobile implementation is explicitly started.
- Root Markdown files hold project-wide policy, status and roadmap material; detailed current guides belong in `docs/`.
- Do not treat `archive/legacy/` as active source or release documentation.

See `../PROJECT_OVERVIEW.md`, `../CURRENT_STATE.md` and `../ROADMAP.md` for product scope, current status and planned work.
