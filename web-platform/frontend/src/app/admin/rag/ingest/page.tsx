"use client";

import { useCallback, useEffect, useState } from "react";

import { adminFetch } from "@/components/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";

type IngestResult = {
  sources?: number;
  brain_items?: number;
  chunks?: number;
  attempts?: number;
  errors?: number;
  correlation_id?: string;
};

type IngestError = {
  error_type?: string;
  message?: string;
  retry?: { retryable?: boolean; attempt?: number; max_attempts?: number };
  correlation?: { correlation_id?: string };
};

export default function AdminRagIngestPage() {
  const { token, isAuthenticated } = useAdminAuth();
  const [result, setResult] = useState<IngestResult | null>(null);
  const [error, setError] = useState<IngestError | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [running, setRunning] = useState(false);

  const ingest = useCallback(async () => {
    if (!token || !isAuthenticated) return;
    setRunning(true);
    setError(null);
    try {
      const response = await adminFetch("/api/admin/rag/ingest/sources", token, { method: "POST" });
      setResult((await response.json()) as IngestResult);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      try {
        const parsed = JSON.parse(message) as IngestError & { detail?: IngestError };
        setError(parsed.detail ?? parsed);
      } catch {
        setError({ message: "RAG ingestion failed. Retry or contact an administrator." });
      }
    } finally {
      setRunning(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    setResult(null);
    setError(null);
    setDetailsOpen(false);
  }, [token]);

  if (!isAuthenticated || !token) {
    return <main className="page-shell"><p className="admin-status">Admin authentication required.</p></main>;
  }

  return (
    <main className="page-shell">
      <section className="admin-panel">
        <p className="eyebrow">RAG ingestion</p>
        <h1>Ingest knowledge sources</h1>
        <p className="muted">Run an authenticated ingestion pass and review its progress summary.</p>
        <button className="primary-button" type="button" onClick={ingest} disabled={running}>
          {running ? "Ingesting..." : "Start ingestion"}
        </button>
        {result ? (
          <div role="status" className="admin-status">
            <p>Processed {result.sources ?? 0} sources and {result.brain_items ?? 0} brain items.</p>
            <p>Created {result.chunks ?? 0} chunks in {result.attempts ?? 1} attempt(s). Errors: {result.errors ?? 0}.</p>
          </div>
        ) : null}
        {error ? (
          <div role="alert" className="admin-status">
            <p>{error.message ?? "RAG ingestion failed."}</p>
            {error.correlation?.correlation_id ? <p>Correlation ID: {error.correlation.correlation_id}</p> : null}
            {error.retry?.retryable ? (
              <button className="ghost-button" type="button" onClick={ingest} disabled={running}>Retry ingestion</button>
            ) : null}
            {error.correlation?.correlation_id ? (
              <button className="ghost-button" type="button" onClick={() => setDetailsOpen(true)}>View error details</button>
            ) : null}
          </div>
        ) : null}
      </section>
      {detailsOpen && error ? (
        <div role="dialog" aria-modal="true" aria-label="RAG ingestion error details" className="admin-panel">
          <h2>Error details</h2>
          <p>Type: {error.error_type ?? "unknown"}</p>
          <p>Attempt: {error.retry?.attempt ?? "unknown"} / {error.retry?.max_attempts ?? "unknown"}</p>
          <p>Correlation ID: {error.correlation?.correlation_id ?? "unknown"}</p>
          <button className="ghost-button" type="button" onClick={() => setDetailsOpen(false)}>Close details</button>
        </div>
      ) : null}
    </main>
  );
}
