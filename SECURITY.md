# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are
currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 5.1.x   | :white_check_mark: |
| 5.0.x   | :x:                |
| 4.0.x   | :white_check_mark: |
| < 4.0   | :x:                |

## Reporting a Vulnerability

Use this section to tell people how to report a vulnerability.

Tell them where to go, how often they can expect to get an update on a
reported vulnerability, what to expect if the vulnerability is accepted or
declined, etc.

## Vercel Operational Lock

Vercel configuration overrides are intentionally not committed in `web-platform/frontend/vercel.json`. If Vercel is disabled or paused for this project, do not re-enable Vercel deployment or restore Vercel-specific build/install/output overrides unless the project owner explicitly authorizes it.

The canonical frontend deployment/runtime configuration is maintained outside this deleted override file. This note is an operational guardrail: **when Vercel is turned off, keep it off until explicit authorization is given to turn it back on.**


## Dependency Bot Policy

Dependabot is enabled weekly for the frontend npm dependencies and backend Python dependencies. Dependency branches are reviewed by impact rather than merged automatically.

- `source-map-js-1.2.2`: accepted into `main` because it is a narrow dependency update with no application-level breaking change observed.
- `multi-d49ef80a9c`: not accepted because it upgrades Tailwind CSS from 3.x to 4.x, which is a major framework change and requires a separate compatibility migration.
- The remaining stale Dependabot branch is not part of the production release path.

## CI Security Gate

The security workflow fails on high/critical findings that are not explicitly classified as build/dev-only or otherwise reviewed. Known non-runtime dependency findings are documented in the workflow rather than hidden from audit output. Runtime dependencies and application-shipped code remain subject to the high/critical gate.

## Production Security State

Production database schema is at Alembic revision `20261005_0010`. RLS remains deny-by-default for the newly protected audit/storage tables. Provider secrets remain backend/Render-side and are not intended for frontend code.

Vercel remains under an explicit operational lock: if it is disabled, do not re-enable it or restore Vercel-specific override configuration without project-owner authorization.
