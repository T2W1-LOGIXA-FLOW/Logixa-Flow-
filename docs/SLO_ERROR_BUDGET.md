# Logixa Flow — SLO and Error Budget

> Owner: Engineering / Operations
> Status: IMPLEMENTED — synthetic probe and webhook alert workflow merged; production alert test and measurement window pending
> Last Updated: 2026-10-14

## Purpose
Define measurable production objectives before release freeze. SLOs are evaluated from production telemetry; configuration alone is not evidence.

## Initial release SLOs

| Service path | SLO | Window | Error-budget policy |
|---|---:|---|---|
| Public/API availability | >= 99.5% | 30 days | Freeze non-essential releases when exhausted |
| Authenticated/admin API availability | >= 99.5% | 30 days | Incident review before further production change |
| Workflow terminal completion | >= 99.0% of accepted runs | 30 days | Investigate retry, claim, queue, and provider failures |
| RAG search success | >= 99.0% | 30 days | Use supported fallback and investigate persistent errors |
| Provider operation success | >= 99.0% per provider | 30 days | Fail over only through tested provider policy |
| Scheduled execution punctuality | >= 99.0% within tolerance | 30 days | Investigate scheduler/QStash/worker drift |

## Measurement rules
- Availability excludes intentional 4xx validation/authentication responses; unexpected 5xx, timeout, and infrastructure failures count as errors.
- Workflow success is measured from accepted run to durable terminal state, not HTTP acknowledgement alone.
- RAG success includes successful retrieval or an explicitly supported fallback response; unhandled search failures count as errors.
- Provider SLOs are measured per provider and operation class; one provider must not hide another provider outage.
- Scheduled punctuality uses the persisted scheduled_for timestamp and an explicitly documented tolerance.

## Error-budget policy
When a 30-day budget falls below 50%, production changes require explicit operational review. At 0%, freeze feature releases and prioritize reliability work, except emergency security fixes.

## Certification evidence
Record observation window, denominator, numerator, error classification, telemetry source, incident references, and calculation timestamp. A dashboard screenshot without an auditable query/export is insufficient.

## Synthetic probe and alert path

`.github/workflows/production-slo-probe.yml` runs the HTTPS `/health` probe every 15 minutes, on manual dispatch, and after a change to the probe workflow is pushed to `main` (a path-scoped trigger that validates workflow edits). Each run records UTC timestamp, HTTP status, latency, attempt count, and Actions run URL as a 30-day artifact. PR #105 (merged as `e13ed68c26397ee01ebfc05848a4649dcf1e6710`) adds up to three attempts with a 25-second per-attempt timeout and 5-second gaps to tolerate Render cold starts. Curl failures are handled explicitly so failure evidence is written and uploaded instead of being skipped by shell `-e` behavior. Run #38384976632 failed before this fix after a 20-second timeout while Render logs showed application startup. Post-merge run [#38412066986](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38412066986) passed with HTTP 200, latency 5.962 seconds, and one attempt, validating the retry-capable probe after the workflow change. The earlier failed observation remains in the history and is not erased by the later success. Configure the GitHub `production` environment secrets `PRODUCTION_API_URL` and `OPS_ALERT_WEBHOOK_URL`. The workflow sends a notification on probe failure; manual dispatch with `test_alert=true` sends a clearly labelled test notification when the probe succeeds. Run that test once and retain its Actions run as evidence.

This is **synthetic health availability**, not a substitute for real request/error telemetry, workflow completion SLOs, or latency percentiles. A 30-day SLO/error-budget pass must not be claimed until the observation window is complete and the numerator/denominator can be independently reconstructed from retained evidence. Scheduled Actions runs may be delayed or skipped, so record gaps and do not silently treat missing probes as successes.

## Latest status reconciliation (2026-10-14)

The latest cited synthetic probe [#38412066986](https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/38412066986) returned HTTP 200 in 5.962 seconds. A separate direct `/health` request returned HTTP 200 in 1.943 seconds during the 2026-10-13 audit. Render request-count and latency metrics returned empty datapoints for the inspected window. These are point-in-time synthetic health observations only: the alert-path test, auditable request/error numerator and denominator, and full observation window remain PENDING.

## Current state
The SLO contract is repository-defined but not production-measured. A bounded Render event inspection for 2026-10-09 16:45Z through 2026-10-10 16:50Z found no matching `server_failed`, failed `build_ended`, or `image_pull_failed` events in the returned event set. However, queried Render metrics did not provide HTTP request-count or latency datapoints for that window; only sparse CPU/memory datapoints were available. Therefore no availability/latency numerator, denominator, error budget, or SLO pass can be calculated from this evidence. Final certification remains blocked until request/error telemetry, an auditable measurement query/export, alert-path verification, and the required observation window are available.
