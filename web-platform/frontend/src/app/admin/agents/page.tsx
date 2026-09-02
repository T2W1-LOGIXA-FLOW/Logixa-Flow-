"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { adminFetch, AgentRun, AgentRunsPage } from "@/components/api";
import { ChevronLeft, ChevronRight, Plus, MessageCircle } from "lucide-react";
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
      <main className="page-shell">
        <div className="max-w-4xl mx-auto py-8 space-y-6">
          <AdminGridSkeleton />
        </div>
      </main>
    );
  }

  return (
    <main className={`page-shell ${styles.agentPage}`}>
      <AdminBreadcrumb currentPage="AI Agents" />

      <section className="agent-header">
        <div>
          <p className="eyebrow">AI Management</p>
          <h1 className="text-3xl font-black text-white md:text-4xl">Agent Runs</h1>
          <p className="text-muted">Persisted execution history from the current API result set. Live monitoring and agent configuration management are not connected.</p>
        </div>
        <div className="flex gap-3">
          <Link className="primary-button inline-flex items-center gap-2" href="/admin/agent-chat">
            <MessageCircle className="h-4 w-4" />
            Chat with Agent
          </Link>
          <Link className="ghost-button inline-flex items-center gap-2" href="/admin/agent-chat">
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
        placeholder="Search agents..."
      />

      {!loading && !error && <AdminAgentMetrics runs={agents} />}

      {loading ? (
        <AdminGridSkeleton />
      ) : agents.length === 0 ? (
        <AdminEmptyState
          title={searchQuery ? "No agent runs found" : "0 loaded runs"}
          description={searchQuery ? "No persisted runs match the current server-side search." : "The current API result set contains no persisted Agent Runs."}
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
          <nav className="mt-6 flex items-center justify-between" aria-label="Agent runs pagination">
            <span className="text-sm text-slate-400">
              Loaded {agents.length} of {totalRuns} runs
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="ghost-button inline-flex items-center gap-2"
                onClick={() => setOffset(Math.max(0, offset - pageSize))}
                disabled={offset === 0 || loading}
                aria-label="Previous agent runs page"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </button>
              <button
                type="button"
                className="ghost-button inline-flex items-center gap-2"
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
