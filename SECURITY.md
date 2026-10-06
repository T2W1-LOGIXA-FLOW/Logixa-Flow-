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
