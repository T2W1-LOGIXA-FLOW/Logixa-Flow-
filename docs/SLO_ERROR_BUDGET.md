# Logixa Flow — SLO and Error Budget

> Owner: Engineering / Operations
> Status: PRE-STAGED
> Last Updated: 2026-10-08

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

## Current state
The SLO contract is repository-defined but not production-measured. Final certification remains blocked until production telemetry/monitoring evidence is attached to the release evidence index.
