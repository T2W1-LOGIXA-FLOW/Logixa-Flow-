"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Brain,
  Sparkles,
  CheckCircle2,
  XCircle,
  FileEdit,
  Globe,
  Undo2,
  ExternalLink,
  Layers,
  Database,
  Search,
  Filter,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import { AiMemory, Post, adminFetch, IntelligenceSource } from "@/components/api";
import EmptyState from "@/components/EmptyState";
import Skeleton from "@/components/shadcn/Skeleton";
import Citations, { Match } from "@/components/Citations";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { getAdminSessionToken } from "@/lib/adminSession";

const filters: Array<AiMemory["status"] | "all"> = ["pending", "approved", "rejected", "published", "all"];

// ─── Brain Soul Layer Header Banner ─────────────────────────────────
interface BSData {
  total_syntheses?: number;
  soul_file_entries?: number;
  latest_synthesis_period?: string;
  latest_synthesis_at?: string;
  approved_memories?: number;
  synthesis_tokens_today?: number;
}

function BrainSoulMini() {
  const [data, setData] = useState<BSData | null>(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getAdminSessionToken();
    if (!token) return;
    try {
      const res = await adminFetch("/api/admin/usage/brain-dashboard", token);
      if (res.ok) {
        const d = await res.json();
        setData(d.brain);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function synthesize() {
    const token = await getAdminSessionToken();
    if (!token) return;
    setSynthesizing(true);
    setMsg(null);
    try {
      const res = await adminFetch("/api/admin/brain/synthesize", token, { method: "POST" });
      setMsg(res.ok ? "Synthesis started." : "Synthesis failed.");
      void load();
    } catch {
      setMsg("Error.");
    } finally {
      setSynthesizing(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-slate-950 p-5 shadow-xl backdrop-blur-xl mb-6">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
            </span>
            Brain Soul Layer
          </div>
          <div className="flex flex-wrap gap-4 sm:gap-6 mt-1">
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Syntheses</span>
              <span className="text-xl font-bold text-emerald-400">{data?.total_syntheses ?? "—"}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Soul Entries</span>
              <span className="text-xl font-bold text-cyan-400">{data?.soul_file_entries ?? "—"}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Memories</span>
              <span className="text-xl font-bold text-violet-400">{data?.approved_memories ?? "—"}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Tokens Today</span>
              <span className="text-xl font-bold text-amber-400">
                {data?.synthesis_tokens_today !== undefined ? data.synthesis_tokens_today.toLocaleString() : "—"}
              </span>
            </div>
            {data?.latest_synthesis_period && (
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Period</span>
                <span className="text-sm font-semibold text-slate-200 mt-1">{data.latest_synthesis_period}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {msg && <span className="text-xs font-medium text-emerald-400">{msg}</span>}
          <div className="flex items-center gap-2">
            <button
              onClick={synthesize}
              disabled={synthesizing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {synthesizing ? "Running…" : "Synthesize Now"}
            </button>
            <Link
              href="/admin/usage"
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition"
            >
              <Database className="h-3.5 w-3.5" />
              Usage Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BrainReviewPage() {
  const { token, isAuthenticated, isCheckingAuth } = useAdminAuth();
  const [items, setItems] = useState<AiMemory[]>([]);
  const [filter, setFilter] = useState<AiMemory["status"] | "all">("pending");
  const [search, setSearch] = useState("");

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [matches] = useState<Match[]>([]);
  const [sourcesList] = useState<IntelligenceSource[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }
    setItemsLoading(true);
    setItemsError(null);
    const path = filter === "all" ? "/api/admin/brain" : `/api/admin/brain?status=${filter}`;
    adminFetch(path, token)
      .then((response) => response.json())
      .then((records: AiMemory[]) => {
        setItems(records);
        setSelectedId(records[0]?.id || null);
        setItemsLoading(false);
      })
      .catch(() => {
        setItemsError("Failed to load brain queue. Please try again.");
        setItemsLoading(false);
        toast.error("Brain queue could not be loaded.");
      });
  }, [filter, token, isAuthenticated]);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) || items[0], [items, selectedId]);
  const safeSelectedContent = useMemo(() => sanitizeHtml(selected?.content || ""), [selected?.content]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const query = search.toLowerCase();
    return items.filter(
      (item) =>
        item.source_title?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        item.summary?.toLowerCase().includes(query)
    );
  }, [items, search]);

  async function refresh(nextFilter = filter) {
    const path = nextFilter === "all" ? "/api/admin/brain" : `/api/admin/brain?status=${nextFilter}`;
    const response = await adminFetch(path, token);
    const records = (await response.json()) as AiMemory[];
    setItems(records);
    setSelectedId(records[0]?.id || null);
  }

  async function brainAction(action: "approve" | "reject") {
    if (!selected) {
      return;
    }
    try {
      await adminFetch(`/api/admin/brain/${selected.id}/${action}`, token, { method: "PATCH" });
      toast.success(action === "approve" ? "Draft approved but still private." : "Draft rejected.");
      await refresh();
    } catch {
      toast.error(`Failed to ${action} draft. Please try again.`);
    }
  }

  async function publish(publishNow: boolean) {
    if (!selected) {
      return;
    }
    try {
      const response = await adminFetch(`/api/admin/brain/${selected.id}/publish`, token, {
        method: "PATCH",
        body: JSON.stringify({ publish_now: publishNow }),
      });
      const post = (await response.json()) as Post;
      const result = response.headers.get("X-Brain-Publish-Result");
      toast.success(
        result === "idempotent"
          ? `Already linked: ${post.slug}`
          : result === "republished_linked"
            ? `Republished linked post: ${post.slug}`
            : publishNow
              ? `Published: ${post.slug}`
              : `CMS draft created: ${post.slug}`,
      );
      await refresh(publishNow ? "published" : "approved");
      setFilter(publishNow ? "published" : "approved");
    } catch {
      toast.error("Failed to publish. Please try again.");
    }
  }

  async function unpublish() {
    if (!selected || selected.status !== "published" || !selected.is_public || !selected.post_slug) {
      return;
    }
    const confirmed = window.confirm(
      "Unpublish this linked post? This reversible soft-unpublish keeps the brain memory and post for recovery but removes public visibility.",
    );
    if (!confirmed) {
      return;
    }
    setActionPending(true);
    try {
      await adminFetch(`/api/admin/brain/${selected.id}/unpublish`, token, { method: "PATCH" });
      toast.success("Content unpublished and kept for recovery.");
      await refresh("published");
    } catch {
      toast.error("Failed to unpublish. Please try again.");
    } finally {
      setActionPending(false);
    }
  }

  if (isCheckingAuth || !isAuthenticated || !token) {
    return (
      <main className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto py-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 w-3/4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-8 w-1/3" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-64 col-span-2" />
          </div>
        </div>
      </main>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "rejected":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "published":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    }
  };

  return (
    <main className="space-y-6 pb-12">
      <BrainSoulMini />

      {/* Header Bar */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              Human Review
            </span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">AI Memory</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-xl">
            Agent outputs stay staged here for verification before publishing or embedding into long-term knowledge.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 transition active:scale-95"
            href="/admin/drafts"
          >
            <FileEdit className="h-4 w-4" />
            Create Draft
          </Link>
        </div>
      </section>

      {/* Filter Row Tabs (Solves the unstyled text issue) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-md">
          {filters.map((item) => {
            const active = filter === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition-all ${
                  active
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        {/* Quick Search inside loaded records */}
        <div className="relative min-w-[200px] sm:min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter queue by title..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-9 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition"
          />
        </div>
      </div>

      {/* Main Review Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Queue List (5 cols on lg) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-xl backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Layers className="h-4 w-4 text-cyan-400" />
              Queue ({filteredItems.length})
            </div>
            <button
              onClick={() => refresh()}
              title="Refresh queue"
              className="p-1 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {itemsError ? (
            <div className="p-6 text-center">
              <EmptyState icon="⚠️" title="Failed to load brain queue" description={itemsError} />
            </div>
          ) : itemsLoading ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : filteredItems.length ? (
            <div className="max-h-[620px] overflow-y-auto space-y-2 pr-1">
              {filteredItems.map((item) => {
                const isSelected = selected?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? "border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/5"
                        : "border-slate-800/60 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <strong className="block text-xs sm:text-sm font-semibold text-slate-200 line-clamp-2 leading-snug">
                          {item.source_title}
                        </strong>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                          <span className="font-medium text-cyan-400">{item.category}</span>
                          {item.post_slug && (
                            <>
                              <span>·</span>
                              <span className="truncate text-slate-500 font-mono">{item.post_slug}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getStatusBadge(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <EmptyState
                icon="🧠"
                title={`No ${filter} items`}
                description="Run the AI agent to generate drafts for review, or select a different filter."
                actionLabel="Create Draft"
                actionHref="/admin/drafts"
              />
            </div>
          )}
        </div>

        {/* Right Column: Detail & Decision Inspector (7 cols on lg) */}
        <article className="lg:col-span-7 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md space-y-5">
          {selected ? (
            <>
              {/* Header Details */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div>
                  <span className="inline-block rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-cyan-400 mb-1.5">
                    {selected.category}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">{selected.source_title}</h2>
                  {selected.summary && <p className="mt-1 text-xs sm:text-sm text-slate-400">{selected.summary}</p>}
                </div>
                <span
                  className={`self-start shrink-0 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${getStatusBadge(
                    selected.status
                  )}`}
                >
                  {selected.status}
                </span>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <button
                  type="button"
                  onClick={() => brainAction("approve")}
                  disabled={actionPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 active:scale-95 transition disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => brainAction("reject")}
                  disabled={actionPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 active:scale-95 transition disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => publish(false)}
                  disabled={actionPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 active:scale-95 transition disabled:opacity-50"
                >
                  <FileEdit className="h-3.5 w-3.5 text-cyan-400" />
                  Create CMS Draft
                </button>
                <button
                  type="button"
                  onClick={() => publish(true)}
                  disabled={actionPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20 active:scale-95 transition disabled:opacity-50"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Publish
                </button>
                {selected.status === "published" && selected.is_public && selected.post_slug ? (
                  <button
                    type="button"
                    onClick={unpublish}
                    disabled={actionPending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 active:scale-95 transition disabled:opacity-50"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    Unpublish
                  </button>
                ) : null}
              </div>

              {/* Safe Content Preview */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Verified Content Preview
                </div>
                <div
                  className="rounded-xl border border-slate-800/90 bg-slate-950/80 p-4 sm:p-5 text-sm text-slate-200 leading-relaxed max-h-[400px] overflow-y-auto prose prose-invert prose-sm max-w-none shadow-inner"
                  dangerouslySetInnerHTML={{ __html: safeSelectedContent }}
                />
              </div>

              {/* Citations & Evidence */}
              <Citations matches={matches} sources={sourcesList} />
            </>
          ) : (
            <div className="py-20 text-center">
              <Brain className="mx-auto h-10 w-10 text-slate-600 mb-2" />
              <p className="text-sm text-slate-400">Select a brain record from the queue to review and inspect.</p>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
