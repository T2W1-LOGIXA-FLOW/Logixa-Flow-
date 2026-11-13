"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { AnalyticsData, adminFetch } from "@/components/api";
import MetricsChart from "@/components/charts/MetricsChart";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function AdminAnalyticsPage() {
  const { token, isAuthenticated } = useAdminAuth();
  const [records, setRecords] = useState<AnalyticsData[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setStatus("");
    try {
      const response = await adminFetch("/api/admin/analytics?days=7", token);
      const data: unknown = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("Invalid analytics response");
      }
      setRecords(data as AnalyticsData[]);
    } catch {
      setRecords([]);
      setStatus("Analytics could not be loaded. Retry the request or check the authenticated API health.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && token) void loadAnalytics();
  }, [token, isAuthenticated, loadAnalytics]);

  const totals = useMemo(
    () =>
      records.reduce(
        (sum, row) => ({
          agent_runs: sum.agent_runs + row.agent_runs,
          sources_added: sum.sources_added + row.sources_added,
          published_posts: sum.published_posts + row.published_posts,
          pending_approvals: row.pending_approvals,
        }),
        { agent_runs: 0, sources_added: 0, published_posts: 0, pending_approvals: 0 },
      ),
    [records],
  );

  if (!token) {
    return <p className="empty-state" role="status">Checking admin access…</p>;
  }

  return (
    <main className="page-shell brain-review-page space-y-6">
      <section className="agent-header">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>System Signals</h1>
          <p className="muted">Basic operating metrics for the AI workflow and publishing queue.</p>
        </div>
        <Link className="ghost-button" href="/admin">Admin</Link>
      </section>

      {status ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-200" role="alert">
          <p>{status}</p>
          <button type="button" onClick={() => void loadAnalytics()} disabled={loading} className="rounded-lg border border-rose-400/30 px-3 py-2 font-semibold hover:bg-rose-500/10 disabled:opacity-50">
            {loading ? "Retrying…" : "Retry"}
          </button>
        </div>
      ) : null}

      {!loading && !status ? (
        <p className="admin-status" role="status">Authenticated daily snapshot loaded. Live streaming is not enabled on this view.</p>
      ) : null}

      <section className="admin-metric-grid" aria-label="Analytics totals" aria-busy={loading}>
        <article className="admin-metric-card cyan">
          <span>Agent Runs</span>
          <strong>{loading ? "—" : totals.agent_runs}</strong>
        </article>
        <article className="admin-metric-card orange">
          <span>Sources Added</span>
          <strong>{loading ? "—" : totals.sources_added}</strong>
        </article>
        <article className="admin-metric-card cyan">
          <span>Published Posts</span>
          <strong>{loading ? "—" : totals.published_posts}</strong>
        </article>
        <article className="admin-metric-card orange">
          <span>Pending Approval</span>
          <strong>{loading ? "—" : totals.pending_approvals}</strong>
        </article>
      </section>

      {loading ? (
        <section className="admin-panel p-8 text-center" role="status">Loading authenticated analytics…</section>
      ) : status ? null : records.length === 0 ? (
        <section className="admin-panel p-8 text-center" role="status">
          <h2 className="font-semibold">No analytics events in this period</h2>
          <p className="muted mt-2">The request succeeded, but no activity records were returned for the last seven days.</p>
        </section>
      ) : (
        <>
          <section className="admin-panel metrics-chart-panel">
            <p className="eyebrow">Trends</p>
            <MetricsChart data={records.map((row) => ({
              name: row.date,
              agent_runs: row.agent_runs,
              sources_added: row.sources_added,
              published_posts: row.published_posts,
              pending_approvals: row.pending_approvals,
            }))} />
          </section>

          <section className="admin-panel analytics-table-panel">
            <p className="eyebrow">Last 7 Days</p>
            <div className="analytics-table" role="table" aria-label="Daily analytics">
              <div className="analytics-row header" role="row">
                <span role="columnheader">Date</span>
                <span role="columnheader">Agent</span>
                <span role="columnheader">Sources</span>
                <span role="columnheader">Published</span>
                <span role="columnheader">Pending</span>
              </div>
              {records.map((row) => (
                <div className="analytics-row" key={row.date} role="row">
                  <span role="cell">{row.date}</span>
                  <span role="cell">{row.agent_runs}</span>
                  <span role="cell">{row.sources_added}</span>
                  <span role="cell">{row.published_posts}</span>
                  <span role="cell">{row.pending_approvals}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
