"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { adminFetch } from "@/components/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";

type SearchMatch = { title?: string; score?: number; content?: string };
type SearchResult = { query: string; matches?: SearchMatch[]; attempts?: number; correlation_id?: string; total?: number; page?: number; page_size?: number; has_more?: boolean };
type SearchError = {
  error_type?: string;
  message?: string;
  retry?: { retryable?: boolean; attempt?: number; max_attempts?: number };
  correlation?: { correlation_id?: string };
  fallback?: { used?: boolean; strategy?: string };
  metrics?: { errors?: number };
};

function parseSearchError(caught: unknown): SearchError {
  const message = caught instanceof Error ? caught.message : "";
  try {
    const parsed = JSON.parse(message) as SearchError & { detail?: SearchError };
    return parsed.detail ?? parsed;
  } catch {
    return { message: "RAG search failed. Retry or contact an administrator." };
  }
}

export default function AdminRagSearchPage() {
  const { token, isAuthenticated } = useAdminAuth();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<SearchError | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [sourceType, setSourceType] = useState("");
  const [minScore, setMinScore] = useState("0");
  const [sort, setSort] = useState("relevance");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("6");
  const [multiQuery, setMultiQuery] = useState("");

  const search = useCallback(async () => {
    if (!token || !isAuthenticated || query.trim().length < 3) return;
    setRunning(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: query.trim() });
      if (sourceType) params.set("source_type", sourceType);
      if (minScore !== "0") params.set("min_score", minScore);
      if (sort !== "relevance") params.set("sort", sort);
      if (page !== 1) params.set("page", String(page));
      if (pageSize !== "6") params.set("page_size", pageSize);
      const response = await adminFetch(`/api/admin/rag/search?${params.toString().replace(/\+/g, "%20")}`, token);
      setResult((await response.json()) as SearchResult);
    } catch (caught) {
      const parsed = parseSearchError(caught);
      setError(parsed);
      setErrorCount((count) => count + 1);
    } finally {
      setRunning(false);
    }
  }, [isAuthenticated, minScore, page, pageSize, query, sort, sourceType, token]);

  const batchSearch = useCallback(async () => {
    if (!token || !isAuthenticated) return;
    const queries = multiQuery.split(/\r?\n/).map((item) => item.trim()).filter((item) => item.length >= 3);
    if (!queries.length) return;
    setRunning(true);
    setError(null);
    try {
      const response = await adminFetch("/api/admin/rag/search/batch", token, {
        method: "POST",
        body: JSON.stringify(queries.map((item) => ({ query: item, filters: { source_type: sourceType || null, min_score: Number(minScore) }, sort, pagination: { page: 1, page_size: Number(pageSize) } }))),
      });
      setResult((await response.json()) as SearchResult);
    } catch {
      setError({ message: "Batch search failed. Retry or contact an administrator." });
    } finally {
      setRunning(false);
    }
  }, [isAuthenticated, minScore, multiQuery, pageSize, sort, sourceType, token]);

  useEffect(() => {
    setResult(null);
    setError(null);
    setDetailsOpen(false);
    setErrorCount(0);
  }, [token]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void search();
  }

  if (!isAuthenticated || !token) {
    return <main className="page-shell"><p className="admin-status">Admin authentication required.</p></main>;
  }

  return (
    <main className="page-shell">
      <section className="admin-panel">
        <p className="eyebrow">RAG search</p>
        <h1>Search knowledge sources</h1>
        <p className="muted">Run an authenticated retrieval search and review safe result details.</p>
        <form onSubmit={submit} className="flex gap-3">
          <label className="sr-only" htmlFor="rag-search-query">Search query</label>
          <input
            id="rag-search-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search indexed knowledge"
            minLength={3}
            required
          />
          <button className="primary-button" type="submit" disabled={running || query.trim().length < 3}>
            {running ? "Searching..." : "Search"}
          </button>
        </form>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <label>Source type<input aria-label="Source type filter" value={sourceType} onChange={(event) => setSourceType(event.target.value)} /></label>
          <label>Minimum score<input aria-label="Minimum relevance score" type="number" min="0" max="1" step="0.05" value={minScore} onChange={(event) => setMinScore(event.target.value)} /></label>
          <label>Sort<select aria-label="Sort results" value={sort} onChange={(event) => setSort(event.target.value)}><option value="relevance">Relevance</option><option value="newest">Newest</option><option value="title">Title</option></select></label>
          <label>Page size<select aria-label="Page size" value={pageSize} onChange={(event) => setPageSize(event.target.value)}><option value="6">6</option><option value="12">12</option><option value="20">20</option></select></label>
        </div>
        <div className="mt-4">
          <label htmlFor="rag-multi-query">Multi-query (one query per line)</label>
          <textarea id="rag-multi-query" value={multiQuery} onChange={(event) => setMultiQuery(event.target.value)} />
          <button className="ghost-button mt-2" type="button" onClick={() => void batchSearch()} disabled={running}>Run multi-query</button>
        </div>
        <p role="status" className="admin-status">
          {running ? "Search in progress..." : `Search errors: ${errorCount}`}
        </p>
        {result ? (
          <div className="admin-status">
            <p>Found {result.total ?? result.matches?.length ?? 0} matches in {result.attempts ?? 1} attempt(s).</p>
            {result.matches?.map((match, index) => (
              <article key={`${match.title ?? "match"}-${index}`}>
                <strong>{match.title ?? "Untitled result"}</strong>
                <p>Score: {match.score ?? 0}</p>
                <p>{match.content ?? ""}</p>
              </article>
            ))}
          </div>
        ) : null}
        {result ? (
          <div className="flex gap-3">
            <button className="ghost-button" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || running}>Previous</button>
            <span>Page {page}</span>
            <button className="ghost-button" type="button" onClick={() => setPage((current) => current + 1)} disabled={!result.has_more || running}>Next</button>
          </div>
        ) : null}
        {error ? (
          <div role="alert" className="admin-status">
            <p>{error.message ?? "RAG search failed."}</p>
            {error.correlation?.correlation_id ? <p>Correlation ID: {error.correlation.correlation_id}</p> : null}
            {error.retry?.retryable ? (
              <button className="ghost-button" type="button" onClick={() => void search()} disabled={running}>Retry search</button>
            ) : null}
            {error.correlation?.correlation_id ? (
              <button className="ghost-button" type="button" onClick={() => setDetailsOpen(true)}>View error details</button>
            ) : null}
          </div>
        ) : null}
      </section>
      {detailsOpen && error ? (
        <div role="dialog" aria-modal="true" aria-label="RAG search error details" className="admin-panel">
          <h2>Error details</h2>
          <p>Type: {error.error_type ?? "unknown"}</p>
          <p>Attempt: {error.retry?.attempt ?? "unknown"} / {error.retry?.max_attempts ?? "unknown"}</p>
          <p>Fallback: {error.fallback?.strategy ?? "none"}</p>
          <p>Correlation ID: {error.correlation?.correlation_id ?? "unknown"}</p>
          <button className="ghost-button" type="button" onClick={() => setDetailsOpen(false)}>Close details</button>
        </div>
      ) : null}
    </main>
  );
}
