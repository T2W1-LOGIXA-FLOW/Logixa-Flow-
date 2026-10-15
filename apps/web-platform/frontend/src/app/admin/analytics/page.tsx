"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { AnalyticsData, adminFetch } from "@/components/api";
import MetricsChart from "@/components/charts/MetricsChart";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function AdminAnalyticsPage() {
  const { token, isAuthenticated } = useAdminAuth();
  const [records, setRecords] = useState<AnalyticsData[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }
    adminFetch("/api/admin/analytics?days=7", token)
      .then((response) => response.json())
      .then((data: AnalyticsData[]) => setRecords(data))
      .catch(() => setStatus("Analytics could not be loaded."));
  }, [token, isAuthenticated]);

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
    return <p className="empty-state">Checking admin access...</p>;
  }

  return (
    <main className="page-shell brain-review-page">
      <section className="agent-header">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>System Signals</h1>
          <p className="muted">Basic operating metrics for the AI workflow and publishing queue.</p>
        </div>
        <Link className="ghost-button" href="/admin">
          Admin
        </Link>
      </section>

      {status ? <p className="admin-status">{status}</p> : null}
      <p className="admin-status">Live analytics streaming is unavailable; showing the latest authenticated snapshot.</p>

      <section className="admin-metric-grid">
        <article className="admin-metric-card cyan">
          <span>Agent Runs</span>
          <strong>{totals.agent_runs}</strong>
        </article>
        <article className="admin-metric-card orange">
          <span>Sources Added</span>
          <strong>{totals.sources_added}</strong>
        </article>
        <article className="admin-metric-card cyan">
          <span>Published Posts</span>
          <strong>{totals.published_posts}</strong>
        </article>
        <article className="admin-metric-card orange">
          <span>Pending Approval</span>
          <strong>{totals.pending_approvals}</strong>
        </article>
      </section>

      <section className="admin-panel metrics-chart-panel">
        <p className="eyebrow">Trends</p>
        <MetricsChart
          data={records.map((r) => ({
            name: r.date,
            agent_runs: r.agent_runs,
            sources_added: r.sources_added,
            published_posts: r.published_posts,
            pending_approvals: r.pending_approvals,
          }))}
        />
      </section>

      <section className="admin-panel analytics-table-panel">
        <p className="eyebrow">Last 7 Days</p>
        <div className="analytics-table">
          <div className="analytics-row header">
            <span>Date</span>
            <span>Agent</span>
            <span>Sources</span>
            <span>Published</span>
            <span>Pending</span>
          </div>
          {records.map((row) => (
            <div className="analytics-row" key={row.date}>
              <span>{row.date}</span>
              <span>{row.agent_runs}</span>
              <span>{row.sources_added}</span>
              <span>{row.published_posts}</span>
              <span>{row.pending_approvals}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
