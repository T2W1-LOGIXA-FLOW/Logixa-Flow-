"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { adminFetch, AgentRun, AgentRunsPage } from "@/components/api";
import { ChevronLeft, ChevronRight, Plus, MessageCircle, Bot, Sparkles } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb";
import AdminSearchBar from "@/components/admin/AdminSearchBar";
import AdminGridSkeleton from "@/components/admin/AdminGridSkeleton";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminAgentCard from "@/components/admin/agent/AdminAgentCard";
import AdminAgentMetrics from "@/components/admin/agent/AdminAgentMetrics";
import AdminAgentErrorState from "@/components/admin/agent/AdminAgentErrorState";
import styles from "./agent-theme.module.css";

export default function AdminAgentsPage() {
  const { token, isAuthenticated } = useAdminAuth();
  const [agents, setAgents] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalRuns, setTotalRuns] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const pageSize = 20;

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(offset),
      });
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }
      const response = await adminFetch(`/api/admin/agent/runs?${params.toString()}`, token);
      const data = await response.json();
      if (Array.isArray(data)) {
        setAgents(data);
        setTotalRuns(data.length);
        setHasMore(false);
      } else if (data && Array.isArray(data.items)) {
        const page = data as AgentRunsPage;
        setAgents(page.items);
        setTotalRuns(page.total);
        setHasMore(page.has_more);
      } else {
        throw new Error("Invalid agent runs response");
      }
      setError(null);
    } catch {
      setError("Failed to load agents");
      toast.error("Could not load agents");
    } finally {
      setLoading(false);
    }
  }, [offset, searchQuery, token]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }
    loadAgents();
  }, [token, isAuthenticated, loadAgents]);

  if (!isAuthenticated) {
    return (
      <main className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto py-8 space-y-6">
          <AdminGridSkeleton />
        </div>
      </main>
    );
  }

  return (
    <main className={`space-y-6 pb-12 ${styles.agentPage}`}>
      <AdminBreadcrumb currentPage="AI Agents" />

      {/* Header Bar */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              AI Management
            </span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Agent Runs</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-xl">
            Persisted execution history, multi-step agent reasoning traces, and staged memories from background AI operations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 transition active:scale-95"
            href="/admin/agent-chat"
          >
            <MessageCircle className="h-4 w-4" />
            Chat with Agent
          </Link>
          <Link
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition active:scale-95"
            href="/admin/agent-chat"
          >
            <Plus className="h-4 w-4" />
            Run Agent
          </Link>
        </div>
      </section>

      {error && <AdminAgentErrorState kind="api" detail={error} />}

      <AdminSearchBar
        value={searchQuery}
        onChange={(value) => {
          setOffset(0);
          setSearchQuery(value);
        }}
        placeholder="Search agents by objective, category, or model..."
      />

      {!loading && !error && <AdminAgentMetrics runs={agents} />}

      {loading ? (
        <AdminGridSkeleton />
      ) : agents.length === 0 ? (
        <AdminEmptyState
          title={searchQuery ? "No agent runs found" : "0 loaded runs"}
          description={
            searchQuery
              ? "No persisted runs match the current server-side search."
              : "The current API result set contains no persisted Agent Runs."
          }
          actionLabel={searchQuery ? undefined : "Run AI Agent"}
          actionHref={searchQuery ? undefined : "/admin/agent-chat"}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <AdminAgentCard key={agent.id} run={agent} />
            ))}
          </div>
          <nav className="mt-6 flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-lg" aria-label="Agent runs pagination">
            <span className="text-xs sm:text-sm text-slate-400">
              Loaded <strong className="text-slate-200">{agents.length}</strong> of <strong className="text-slate-200">{totalRuns}</strong> runs
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition disabled:opacity-50"
                onClick={() => setOffset(Math.max(0, offset - pageSize))}
                disabled={offset === 0 || loading}
                aria-label="Previous agent runs page"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition disabled:opacity-50"
                onClick={() => setOffset(offset + pageSize)}
                disabled={!hasMore || loading}
                aria-label="Next agent runs page"
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </nav>
        </>
      )}
    </main>
  );
}
