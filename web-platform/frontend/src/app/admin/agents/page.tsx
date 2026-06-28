"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Skeleton from "@/components/shadcn/Skeleton";
import { adminFetch, AgentRun } from "@/components/api";
import { Plus, MessageCircle } from "lucide-react";
import { AnimatedText } from "@/components/ui/animated-shiny-text";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb";
import AdminSearchBar from "@/components/admin/AdminSearchBar";
import AdminGridSkeleton from "@/components/admin/AdminGridSkeleton";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

export default function AdminAgentsPage() {
  const { token, isAuthenticated } = useAdminAuth();
  const [agents, setAgents] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminFetch("/api/admin/agent/runs?limit=20", token);
      const data = await response.json();
      setAgents(Array.isArray(data) ? data : []);
      setError(null);
    } catch {
      setError("Failed to load agents");
      toast.error("Could not load agents");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }
    loadAgents();
  }, [token, isAuthenticated, loadAgents]);

  const filteredAgents = agents.filter(agent =>
    agent.status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.id?.toString().toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <main className="page-shell">
        <div className="max-w-4xl mx-auto py-8 space-y-6">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <AdminBreadcrumb currentPage="AI Agents" />

      <section className="agent-header">
        <div>
          <p className="eyebrow">AI Management</p>
          <AnimatedText
            text="AI Agents"
            gradientColors="linear-gradient(90deg, #0891b2, #ffffff, #f97316)"
            gradientAnimationDuration={1.5}
            hoverEffect={true}
            textClassName="font-black text-3xl md:text-4xl"
            className="py-0"
          />
          <p className="text-muted">Manage and monitor active AI agents</p>
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

      {error && <p className="admin-status error">{error}</p>}

      <AdminSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search agents..."
      />

      {loading ? (
        <AdminGridSkeleton />
      ) : filteredAgents.length === 0 ? (
        <AdminEmptyState
          title={searchQuery ? "No agents found" : "No agent runs found"}
          description={searchQuery ? "No agents found matching your search" : "Run the AI agent to get started"}
          actionLabel="Run AI Agent"
          actionHref="/admin/agent-chat"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <div key={agent.id} className="admin-panel group flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <p className="eyebrow text-cyan-400">Agent Run</p>
                <span
                  className={`text-xs px-3 py-1 rounded-full font-medium ${
                    agent.status === "completed"
                      ? "bg-green-500/20 text-green-300"
                      : agent.status === "failed"
                        ? "bg-red-500/20 text-red-300"
                        : "bg-blue-500/20 text-blue-300"
                  }`}
                >
                  {agent.status}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-primary group-hover:text-cyan-300 transition">{agent.id}</h3>
                <p className="text-sm text-secondary mt-3">Steps: {agent.steps?.length || 0}</p>
              </div>
              <div className="space-y-3 mt-4 pt-4 border-t border-slate-700/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">{new Date(agent.created_at || "").toLocaleString()}</span>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/brain?id=${agent.id}`} className="flex-1 px-3 py-2 rounded text-xs font-medium bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition">
                    Details
                  </Link>
                  <button className="flex-1 px-3 py-2 rounded text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition">
                    Retry
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
