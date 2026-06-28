"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Skeleton from "@/components/shadcn/Skeleton";
import { adminFetch, Post } from "@/components/api";
import { Plus } from "lucide-react";
import { AnimatedText } from "@/components/ui/animated-shiny-text";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb";
import AdminSearchBar from "@/components/admin/AdminSearchBar";
import AdminGridSkeleton from "@/components/admin/AdminGridSkeleton";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

export default function AdminInsightsPage() {
  const { token, isAuthenticated } = useAdminAuth();
  const [insights, setInsights] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadInsights = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminFetch("/api/posts?type=analysis&category=Supply%20Chain", token);
      const data = await response.json();
      setInsights(Array.isArray(data) ? data : []);
      setError(null);
    } catch {
      setError("Failed to load insights");
      toast.error("Could not load insights");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }
    loadInsights();
  }, [token, isAuthenticated, loadInsights]);

  const filteredInsights = insights.filter(insight =>
    insight.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    insight.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
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
      <AdminBreadcrumb currentPage="Insights" />

      <section className="agent-header">
        <div>
          <p className="eyebrow">Content Management</p>
          <AnimatedText
            text="Insights"
            gradientColors="linear-gradient(90deg, #0891b2, #ffffff, #f97316)"
            gradientAnimationDuration={1.5}
            hoverEffect={true}
            textClassName="font-black text-3xl md:text-4xl"
            className="py-0"
          />
          <p className="text-muted">Supply chain intelligence and market analysis</p>
        </div>
        <Link className="ghost-button inline-flex items-center gap-2" href="/admin/agent-chat">
          <Plus className="h-4 w-4" />
          Create New
        </Link>
      </section>

      {error && <p className="admin-status error">{error}</p>}

      <AdminSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search insights..."
      />

      {loading ? (
        <AdminGridSkeleton />
      ) : filteredInsights.length === 0 ? (
        <AdminEmptyState
          title={searchQuery ? "No insights found" : "No insights found"}
          description={searchQuery ? "No insights found matching your search" : "Create your first insight"}
          actionLabel="Create Insight with AI"
          actionHref="/admin/agent-chat"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInsights.map((insight) => (
            <div key={insight.id} className="admin-panel group flex flex-col">
              <div className="flex-1">
                <p className="eyebrow group-hover:opacity-100 transition text-cyan-400">{insight.type}</p>
                <h3 className="text-lg font-semibold text-primary mt-2 group-hover:text-cyan-300 transition line-clamp-2">{insight.title}</h3>
                <p className="text-sm text-secondary mt-3 line-clamp-2">{insight.excerpt}</p>
              </div>
              <div className="space-y-3 mt-4 pt-4 border-t border-slate-700/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">{insight.category}</span>
                  <span className="text-success font-medium">{insight.status}</span>
                </div>
                <div className="flex gap-2">
                  <Link href={`/blog/${insight.slug}`} className="flex-1 px-3 py-2 rounded text-xs font-medium bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition">
                    View
                  </Link>
                  <Link href={`/admin/brain?edit=${insight.id}`} className="flex-1 px-3 py-2 rounded text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition">
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
