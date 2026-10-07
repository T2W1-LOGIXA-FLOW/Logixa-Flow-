# Logixa Flow — Development

> Owner: Engineering
> Update when: setup, CI policy, or development gates change
> Last Updated: 2026-10-08
> Do NOT put here: production secrets.

## Local setup

Backend: cd web-platform/backend; python -m pip install -r requirements.txt; python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000.

Frontend: cd web-platform/frontend; npm install; npm run dev -- -p 3000.

## Checks

Frontend build: npm run build. Backend tests: python -m pytest -q. Repository hygiene: git diff --check and git status --short.

## CI

Main CI and CodeQL use per-workflow/per-ref concurrency with cancel-in-progress. Documentation-only pushes are excluded from push validation. Pull requests targeting main remain validated. workflow_dispatch is available for deliberate full validation. Do not broaden documentation-only filters to application, dependency, workflow, infrastructure, or configuration changes.

## Development rules

Schema changes use Alembic. Workflow changes update persistence/recovery and tests together. Provider credentials are supplied through environment/deployment configuration. Unit tests do not substitute for live provider verification. Keep implemented, configured, enabled, and live-tested states distinct.
