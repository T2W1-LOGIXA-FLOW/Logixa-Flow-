"use client";

import { useCallback, useEffect, useState } from "react";

import { adminFetch } from "@/components/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";

type Metrics = {
  hours: number;
  total_errors: number;
  error_rate: number;
  by_type: { error_type: string; errors: number; rate: number }[];
  time_series: { timestamp: string; errors: number }[];
  alert: { threshold: number; errors: number; triggered: boolean };
};

export default function AdminRagMetricsPage() {
  const { token, isAuthenticated } = useAdminAuth();
  const [hours, setHours] = useState("24");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadMetrics = useCallback(async () => {
    if (!token || !isAuthenticated) return;
    setLoading(true);
    setError("");
    try {
      const response = await adminFetch(`/api/admin/rag/metrics?hours=${hours}`, token);
      setMetrics((await response.json()) as Metrics);
    } catch {
      setError("RAG metrics are unavailable. Retry or contact an administrator.");
    } finally {
      setLoading(false);
    }
  }, [hours, isAuthenticated, token]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  if (!isAuthenticated || !token) {
    return <main className="page-shell"><p className="admin-status">Admin authentication required.</p></main>;
  }

  const maxErrors = Math.max(...(metrics?.time_series.map((point) => point.errors) ?? [1]), 1);

  return (
    <main className="page-shell">
      <section className="admin-panel">
        <p className="eyebrow">RAG monitoring</p>
        <h1>Error monitoring dashboard</h1>
        <p className="muted">Review safe aggregate error trends without exposing provider or database details.</p>
        <div className="flex items-center gap-3">
          <label htmlFor="rag-metrics-range">Time range</label>
          <select id="rag-metrics-range" value={hours} onChange={(event) => setHours(event.target.value)}>
            <option value="1">Last hour</option>
            <option value="24">Last 24 hours</option>
            <option value="72">Last 3 days</option>
            <option value="168">Last 7 days</option>
          </select>
          <button className="ghost-button" type="button" onClick={() => void loadMetrics()} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
        {error ? <p role="alert" className="admin-status">{error}</p> : null}
        {metrics ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="admin-status"><strong>Total errors</strong><p>{metrics.total_errors}</p></div>
              <div className="admin-status"><strong>Error rate</strong><p>{metrics.error_rate} / hour</p></div>
              <div role="status" className="admin-status">
                <strong>Alert threshold</strong>
                <p>{metrics.alert.errors} / {metrics.alert.threshold}</p>
                <p>{metrics.alert.triggered ? "Threshold reached" : "Within threshold"}</p>
              </div>
            </div>
            <section aria-label="Error rate by type" className="admin-status">
              <h2>Error rate by type</h2>
              {metrics.by_type.length === 0 ? <p>No errors recorded in this range.</p> : null}
              {metrics.by_type.map((item) => (
                <p key={item.error_type}>{item.error_type}: {item.errors} ({item.rate} / hour)</p>
              ))}
            </section>
            <section aria-label="Error trend" className="admin-status">
              <h2>Error trend</h2>
              <div className="flex items-end gap-1" aria-label="Hourly error trend">
                {metrics.time_series.map((point) => (
                  <span
                    key={point.timestamp}
                    title={`${point.timestamp}: ${point.errors}`}
                    style={{ height: `${Math.max(4, (point.errors / maxErrors) * 100)}px` }}
                    className="w-2 bg-cyan-300"
                  />
                ))}
              </div>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
