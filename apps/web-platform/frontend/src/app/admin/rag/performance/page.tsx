"use client";

import { useCallback, useEffect, useState } from "react";

import { adminFetch } from "@/components/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";

type Performance = {
  cache: { entries: number; max_entries: number; ttl_seconds: number; hit_rate: number };
  search: { requests: number; cache_hits: number; timeouts: number; average_duration_ms: number; concurrency_limit: number; timeout_seconds: number };
  query_plan: { index_strategy: string; lazy_loading: boolean; max_candidates: number; ordering_fallback: string };
  recommendations: string[];
};

export default function AdminRagPerformancePage() {
  const { token, isAuthenticated } = useAdminAuth();
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadPerformance = useCallback(async () => {
    if (!token || !isAuthenticated) return;
    setLoading(true);
    setError("");
    try {
      const response = await adminFetch("/api/admin/rag/performance", token);
      setPerformance((await response.json()) as Performance);
    } catch {
      setError("RAG performance data is unavailable. Retry or contact an administrator.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    void loadPerformance();
  }, [loadPerformance]);

  if (!isAuthenticated || !token) {
    return <main className="page-shell"><p className="admin-status">Admin authentication required.</p></main>;
  }

  return (
    <main className="page-shell">
      <section className="admin-panel">
        <p className="eyebrow">RAG performance</p>
        <h1>Performance optimization</h1>
        <p className="muted">Review safe in-process search performance signals and optimization guidance.</p>
        <button className="ghost-button" type="button" onClick={() => void loadPerformance()} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
        {error ? <p role="alert" className="admin-status">{error}</p> : null}
        {performance ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="admin-status"><strong>Cache hit rate</strong><p>{performance.cache.hit_rate * 100}%</p><p>{performance.cache.entries} / {performance.cache.max_entries} entries</p></div>
              <div className="admin-status"><strong>Average search time</strong><p>{performance.search.average_duration_ms} ms</p><p>{performance.search.timeouts} timeout(s)</p></div>
              <div className="admin-status"><strong>Query plan</strong><p>{performance.query_plan.index_strategy}</p><p>{performance.query_plan.lazy_loading ? "Lazy loading enabled" : "Lazy loading disabled"}</p></div>
            </div>
            <section aria-label="Optimization recommendations" className="admin-status">
              <h2>Optimization recommendations</h2>
              {performance.recommendations.map((recommendation) => <p key={recommendation}>{recommendation}</p>)}
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
