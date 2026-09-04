# RAG Reliability, Quality, and Performance

## Feature summary

This document covers the Phase 3C through Phase 7 RAG reliability features. RAG ingestion and search failures use structured, sanitized responses. Each failure includes:

- A safe error classification.
- Retryability and attempt limits.
- A UUID correlation ID.
- Search fallback metadata where applicable.
- Aggregate error metrics and threshold state.

RAG monitoring is admin-only. Error events and alert history are held in bounded process memory; no provider, database, webhook, scheduler, or external notification is invoked by this feature.

## Phase 4-7 feature summary

- **Batch ingestion (Phase 4):** accepts up to 20 multipart files, prepares files in bounded parallel workers, reports per-file/chunk progress, and returns safe retry metadata.
- **Advanced search (Phase 5):** supports source and minimum-score filters, relevance/title/newest ordering, pagination, relevance rank metadata, multi-query aggregation, deduplication, and bounded caching.
- **Performance optimization (Phase 6):** exposes cache and latency signals, bounded search concurrency, candidate limiting/lazy page loading, timeout accounting, cache eviction, and safe optimization recommendations.
- **Quality assurance (Phase 7):** collects bounded admin feedback, computes ratings/helpful rates by variant, and provides explicitly non-persistent A/B test configuration.

## API endpoints

All endpoints below require the existing admin authorization dependency.

### Search

`GET /api/admin/rag/search?q=<query>&top_k=<1-20>&source_type=<type>&min_score=<0-1>&sort=<relevance|newest|title>&page=<n>&page_size=<1-50>`

Returns the query, matches, correlation ID, and attempt count. Search failures return sanitized structured details with one of `query`, `embedding`, `search`, `ranking`, or `unknown`.

`POST /api/admin/rag/search/batch`

Accepts 1–10 validated query objects. Searches run with isolated worker sessions, then results are deduplicated and aggregated.

### Metrics

`GET /api/admin/rag/metrics?hours=<1-168>`

Returns total errors, hourly error-rate points, error counts/rates by type, and threshold status for the selected range.

### Performance

`GET /api/admin/rag/performance`

Returns safe process-local cache hit/capacity, request latency, timeout, concurrency, candidate-limit, lazy-loading, and ordering-fallback signals. It does not run live database `EXPLAIN`.

### Alerts

`GET /api/admin/rag/alerts`

Returns the current in-process threshold, configured mock channels, and newest-first alert history.

`POST /api/admin/rag/alerts/config`

Accepts:

```json
{
  "threshold": 5,
  "channels": [
    {"channel": "in_app", "enabled": true},
    {"channel": "log", "enabled": true}
  ]
}
```

Configuration is process-local and the response explicitly reports `"persistent": false`.

### Ingestion

`POST /api/admin/rag/ingest/sources`

Ingestion errors use validation, transient, embedding, database, or unknown classifications and include retry/correlation metadata.

`POST /api/admin/rag/ingest/batch`

Accepts multipart `files` (maximum 20) and returns batch ID, per-file status, chunk totals, and safe recovery metadata.

### Quality

`POST /api/admin/rag/quality/feedback`

Accepts a query ID, 1–5 rating, helpful flag, optional bounded comment, and variant. Feedback is retained only in bounded process memory.

`GET /api/admin/rag/quality`

Returns aggregate feedback count, average rating, helpful rate, per-variant aggregates, report text, and A/B configuration.

`GET /api/admin/rag/quality/ab-test` and `POST /api/admin/rag/quality/ab-test`

Read or replace the local A/B test configuration. Responses explicitly report `"persistent": false`; no assignment or external experiment service is invoked.

## UI components

- `/admin/rag/ingest`: authenticated ingestion action, progress/error counts, retry control, correlation ID, and safe error details dialog.
- `/admin/rag/search`: authenticated search form, progress state, result list, retry control, error count, and safe error details dialog.
- `/admin/rag/metrics`: time-range selector, aggregate totals, per-type rates, hourly trend bars, and threshold status.
- `/admin/rag/alerts`: process-local threshold configuration, mock channel state, and alert history.
- `/admin/rag/performance`: cache status, latency/timeouts, query-plan signals, and optimization recommendations.
- `/admin/rag/quality`: quality metrics, feedback collection, per-variant reporting, and A/B test status.

The UI does not display raw provider/database exception text or secret values.

## Configuration options

| Option | Default | Purpose |
| --- | --- | --- |
| `RAG_ERROR_ALERT_THRESHOLD` | `5` | Initial error count at which alert state is triggered. |
| `RAG_TOP_K` | `6` | Default number of RAG search matches. |
| `RAG_CHUNK_SIZE` | `800` | Ingestion chunk size exposed by the existing status endpoint. |
| `RAG_CHUNK_OVERLAP` | `150` | Ingestion chunk overlap exposed by the existing status endpoint. |
| `STRUCTURED_LOGS` | `true` | Enables structured JSON logging through the existing logging setup. |
| `RAG_ERROR_ALERT_THRESHOLD` | `5` | Default in-memory error threshold. |
| Search cache TTL | `30 seconds` | Fixed process-local cache lifetime. |
| Search cache capacity | `512 entries` | Fixed bounded cache size with oldest-entry eviction. |
| Search concurrency | `4` | Fixed semaphore limit for search work and batch workers. |
| Search timeout | `5 seconds` | Search elapsed-time threshold used for safe timeout reporting. |
| Batch file limit | `20 files` | Maximum files accepted by batch ingestion. |
| Quality feedback retention | `5000 records` | Maximum in-memory feedback records. |

The alert configuration endpoint can override the threshold for the current process only. It does not write environment files, databases, or deployment configuration.

## Known limitations

- Error events and alert history are lost on process restart and are bounded in memory.
- Alert dispatch is intentionally mock-only and writes structured intent to the application logger.
- Metrics are aggregate counts; they do not persist request-level traces or raw exception details.
- The dashboard uses simple accessible text and bar visualizations rather than a charting dependency.
- Full backend-suite cleanliness is not claimed because repository-wide fixtures are not isolated.
- Performance counters, cache entries, feedback, A/B configuration, and quality reports are process-local and reset on restart.
- Timeout reporting cannot forcibly cancel provider/database work already in progress.
- Newest sorting falls back to relevance when search results do not contain `created_at`.
- The performance query plan is descriptive metadata, not live index usage telemetry.
- A/B testing has configuration only; it does not assign users or calculate statistical significance.

## Future improvements

- Persist sanitized metrics and alert history in a dedicated observability store.
- Add a real notification adapter behind explicit configuration and provider-specific safeguards.
- Add rate-based and windowed alert policies with recovery notifications.
- Add retention, pagination, and export controls for long-lived alert history.
- Add dashboard access controls for separate read-only and configuration roles.
- Add durable quality feedback with privacy retention controls and reviewer workflows.
- Add experiment assignment, sample-size tracking, and statistical confidence intervals.
- Add cancellable async search execution and measured database index telemetry.

## Next phase recommendations

1. Define an isolated backend test database and transactional fixtures.
2. Decide on the supported notification provider and threat model before enabling external dispatch.
3. Add durable metrics retention and alert deduplication.
4. Add operational runbooks for correlation-ID investigation and threshold tuning.
5. Establish isolated backend test fixtures before enabling durable metrics or quality storage.
