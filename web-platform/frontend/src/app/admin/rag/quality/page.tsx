"use client";

import { useCallback, useEffect, useState } from "react";

import { adminFetch } from "@/components/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";

type Quality = {
  feedback_count: number;
  average_rating: number;
  helpful_rate: number;
  by_variant: Record<string, { feedback_count: number; average_rating: number; helpful_rate: number }>;
  ab_test: { name: string; control: string; treatment: string; enabled: boolean };
  report: string;
};

export default function AdminRagQualityPage() {
  const { token, isAuthenticated } = useAdminAuth();
  const [quality, setQuality] = useState<Quality | null>(null);
  const [queryId, setQueryId] = useState("");
  const [rating, setRating] = useState("5");
  const [helpful, setHelpful] = useState("true");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadQuality = useCallback(async () => {
    if (!token || !isAuthenticated) return;
    setLoading(true);
    try {
      const response = await adminFetch("/api/admin/rag/quality", token);
      setQuality((await response.json()) as Quality);
    } catch {
      setMessage("RAG quality data is unavailable. Retry or contact an administrator.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => { void loadQuality(); }, [loadQuality]);

  async function submitFeedback() {
    if (!token || !isAuthenticated || !queryId.trim()) return;
    setLoading(true);
    try {
      await adminFetch("/api/admin/rag/quality/feedback", token, {
        method: "POST",
        body: JSON.stringify({ query_id: queryId.trim(), rating: Number(rating), helpful: helpful === "true" }),
      });
      setMessage("Feedback recorded.");
      setQueryId("");
      await loadQuality();
    } catch {
      setMessage("Feedback could not be recorded.");
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated || !token) return <main className="page-shell"><p className="admin-status">Admin authentication required.</p></main>;

  return (
    <main className="page-shell">
      <section className="admin-panel">
        <p className="eyebrow">RAG quality assurance</p>
        <h1>Quality dashboard</h1>
        <p className="muted">Review aggregate feedback and configure a local, non-persistent search A/B test.</p>
        {message ? <p role="status" className="admin-status">{message}</p> : null}
        {quality ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="admin-status"><strong>Feedback</strong><p>{quality.feedback_count}</p></div>
              <div className="admin-status"><strong>Average rating</strong><p>{quality.average_rating} / 5</p></div>
              <div className="admin-status"><strong>Helpful rate</strong><p>{quality.helpful_rate * 100}%</p></div>
            </div>
            <section aria-label="Quality report" className="admin-status">
              <h2>Quality report</h2><p>{quality.report}</p>
              {Object.entries(quality.by_variant).map(([variant, values]) => <p key={variant}>{variant}: {values.feedback_count} responses, {values.average_rating} / 5</p>)}
            </section>
            <section aria-label="Feedback collection" className="admin-status">
              <h2>Collect feedback</h2>
              <input aria-label="Query ID" value={queryId} onChange={(event) => setQueryId(event.target.value)} placeholder="Query ID" />
              <select aria-label="Rating" value={rating} onChange={(event) => setRating(event.target.value)}><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select>
              <select aria-label="Helpful" value={helpful} onChange={(event) => setHelpful(event.target.value)}><option value="true">Helpful</option><option value="false">Not helpful</option></select>
              <button className="primary-button" type="button" onClick={() => void submitFeedback()} disabled={loading || !queryId.trim()}>Submit feedback</button>
            </section>
            <section aria-label="A/B test configuration" className="admin-status">
              <h2>A/B test configuration</h2><p>{quality.ab_test.control} vs {quality.ab_test.treatment} ({quality.ab_test.enabled ? "enabled" : "disabled"})</p>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
