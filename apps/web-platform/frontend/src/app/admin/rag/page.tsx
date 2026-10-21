"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Database,
  RefreshCw,
  Trash2,
  Upload,
  Search,
  Filter,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  BarChart2,
  Layers,
} from "lucide-react";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb";
import { adminFetch } from "@/components/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";

type Source = {
  id: number;
  title: string;
  url?: string | null;
  category: string;
  trust_score: number;
  knowledge_status: string;
  publication_status: string;
  source_version: number;
  indexing_status: string;
  indexed_at?: string | null;
  indexing_error?: string | null;
  freshness_score: number;
};

export default function RagIndexPage() {
  const { token, isAuthenticated } = useAdminAuth();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await adminFetch("/api/admin/knowledge/sources", token);
      setSources(await response.json());
    } catch {
      toast.error("Knowledge sources could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && token) load();
  }, [isAuthenticated, token, load]);

  async function reindex(id: number) {
    if (!token) return;
    setBusy(id);
    try {
      await adminFetch(`/api/admin/knowledge/sources/${id}/reindex`, token, { method: "POST" });
      toast.success("Source re-indexed.");
      await load();
    } catch {
      toast.error("Source re-index failed.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: number) {
    if (!token || !window.confirm("Delete this source and its RAG embeddings?")) return;
    setBusy(id);
    try {
      await adminFetch(`/api/admin/knowledge/sources/${id}`, token, { method: "DELETE" });
      toast.success("Source deleted.");
      await load();
    } catch {
      toast.error("Source deletion failed.");
    } finally {
      setBusy(null);
    }
  }

  const filteredSources = useMemo(() => {
    return sources.filter((s) => {
      const matchesSearch =
        !search.trim() ||
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase()) ||
        (s.url && s.url.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "indexed" && s.indexing_status === "indexed") ||
        (statusFilter === "pending" && s.indexing_status !== "indexed" && !s.indexing_error) ||
        (statusFilter === "error" && Boolean(s.indexing_error));

      return matchesSearch && matchesStatus;
    });
  }, [sources, search, statusFilter]);

  const stats = useMemo(() => {
    const total = sources.length;
    const indexed = sources.filter((s) => s.indexing_status === "indexed").length;
    const errors = sources.filter((s) => Boolean(s.indexing_error)).length;
    const avgFreshness = total
      ? Math.round((sources.reduce((acc, s) => acc + s.freshness_score, 0) / total) * 100)
      : 0;
    return { total, indexed, errors, avgFreshness };
  }, [sources]);

  if (!isAuthenticated) return null;

  return (
    <main className="space-y-6 pb-12">
      <AdminBreadcrumb currentPage="RAG Index" />

      {/* Header Bar */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              Knowledge
            </span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">RAG Index</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-xl">
            Track source lifecycle, vector embeddings, freshness health, and real-time re-index operations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/admin/rag/search"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
          >
            <Search className="h-3.5 w-3.5 text-cyan-400" />
            Semantic Search
          </Link>
          <Link
            href="/admin/rag/metrics"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
          >
            <BarChart2 className="h-3.5 w-3.5 text-violet-400" />
            Metrics
          </Link>
          <Link
            href="/admin/import"
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 transition active:scale-95"
          >
            <Upload className="h-4 w-4" />
            Import Source
          </Link>
        </div>
      </section>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-lg backdrop-blur-md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Sources</span>
          <p className="mt-2 text-2xl font-extrabold text-white">{stats.total}</p>
          <p className="mt-1 text-xs text-slate-500">Tracked in knowledge base</p>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-lg backdrop-blur-md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Indexed Ratio</span>
          <p className="mt-2 text-2xl font-extrabold text-emerald-400">
            {stats.indexed} <span className="text-sm font-normal text-slate-400">/ {stats.total}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Embeddings active in vector DB</p>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-lg backdrop-blur-md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg. Freshness</span>
          <p className="mt-2 text-2xl font-extrabold text-cyan-400">{stats.avgFreshness}%</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${stats.avgFreshness}%` }}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-lg backdrop-blur-md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Health Status</span>
          <div className="mt-2 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <p className="text-base font-bold text-white">RAG Engine Live</p>
          </div>
          <p className="mt-1 text-xs text-slate-500">{stats.errors ? `${stats.errors} failed source(s)` : "Zero indexing errors"}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-md">
          {[
            { id: "all", label: "All Sources" },
            { id: "indexed", label: "Indexed" },
            { id: "pending", label: "Needs Indexing" },
            { id: "error", label: "Errors" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === tab.id
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px] sm:min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search source title, category, URL..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-9 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition"
          />
        </div>
      </div>

      {/* Table Section */}
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl backdrop-blur-md overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400 space-y-3">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-cyan-400" />
            <p>Loading knowledge sources from database...</p>
          </div>
        ) : filteredSources.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400 space-y-3">
            <Database className="mx-auto h-8 w-8 text-slate-600" />
            <p className="font-semibold text-slate-300">No knowledge sources match the current filter.</p>
            <p className="text-xs text-slate-500">Use the Import page to ingest JSON, CSV, Markdown, TXT, or HTML.</p>
            <Link
              href="/admin/import"
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-400 hover:bg-cyan-500/20 transition"
            >
              <Upload className="h-3.5 w-3.5" /> Import Data
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800/90 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4 sm:px-6">Source</th>
                  <th className="py-3.5 px-4">Knowledge Status</th>
                  <th className="py-3.5 px-4">Index Status</th>
                  <th className="py-3.5 px-4">Freshness</th>
                  <th className="py-3.5 px-4 text-right sm:pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm">
                {filteredSources.map((source) => {
                  const isIndexed = source.indexing_status === "indexed";
                  const isBusy = busy === source.id;
                  return (
                    <tr
                      key={source.id}
                      className="transition-colors hover:bg-slate-800/30"
                    >
                      <td className="py-3.5 px-4 sm:px-6">
                        <strong className="block font-semibold text-white text-xs sm:text-sm leading-snug">
                          {source.title}
                        </strong>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                          <span className="font-medium text-cyan-400">{source.category}</span>
                          <span>·</span>
                          <span>v{source.source_version}</span>
                          {source.url && (
                            <>
                              <span>·</span>
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition"
                              >
                                link <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
                          {source.knowledge_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                            isIndexed
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : source.indexing_error
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {isIndexed ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : source.indexing_error ? (
                            <AlertCircle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {source.indexing_status}
                        </span>
                        {source.indexing_error ? (
                          <div className="mt-1 text-[11px] text-rose-400 font-mono line-clamp-1">
                            {source.indexing_error}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-cyan-400"
                              style={{ width: `${Math.round(source.freshness_score * 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-slate-300">
                            {Math.round(source.freshness_score * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right sm:pr-6 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => reindex(source.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 active:scale-95 transition disabled:opacity-50"
                          >
                            <RefreshCw className={`h-3 w-3 ${isBusy ? "animate-spin" : ""}`} />
                            Re-index
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => remove(source.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 active:scale-95 transition disabled:opacity-50"
                            title="Delete knowledge source"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
