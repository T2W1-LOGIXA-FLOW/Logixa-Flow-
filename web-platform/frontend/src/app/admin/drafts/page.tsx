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

export default function AdminDraftsPage() {
  const { token, isAuthenticated } = useAdminAuth();
  const [drafts, setDrafts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadDrafts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminFetch("/api/posts?status=draft", token);
      const data = await response.json();
      setDrafts(Array.isArray(data) ? data : []);
      setError(null);
    } catch {
      setError("Failed to load drafts");
      toast.error("Could not load drafts");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }
    loadDrafts();
  }, [token, isAuthenticated, loadDrafts]);

  const filteredDrafts = drafts.filter(draft =>
    draft.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    draft.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
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
      <AdminBreadcrumb currentPage="Drafts" />

      <section className="agent-header">
        <div>
          <p className="eyebrow">Content Management</p>
          <AnimatedText
            text="Drafts"
            gradientColors="linear-gradient(90deg, #f97316, #ffffff, #0891b2)"
            gradientAnimationDuration={1.5}
            hoverEffect={true}
            textClassName="font-black text-3xl md:text-4xl"
            className="py-0"
          />
          <p className="text-muted">Work-in-progress articles and insights</p>
        </div>
        <Link className="ghost-button inline-flex items-center gap-2" href="/admin/agent-chat">
          <Plus className="h-4 w-4" />
          New Draft
        </Link>
      </section>

      {error && <p className="admin-status error">{error}</p>}

      <AdminSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search drafts..."
      />

      {loading ? (
        <AdminGridSkeleton />
      ) : filteredDrafts.length === 0 ? (
        <AdminEmptyState
          title={searchQuery ? "No drafts found" : "No draft articles found"}
          description={searchQuery ? "No drafts found matching your search" : "Create your first draft"}
          actionLabel="Create Draft with AI"
          actionHref="/admin/agent-chat"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrafts.map((draft) => (
            <div key={draft.id} className="admin-panel group flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <p className="eyebrow text-cyan-400">{draft.type}</p>
                <span className="text-xs px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full font-medium">Draft</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-primary group-hover:text-cyan-300 transition line-clamp-2">{draft.title}</h3>
                <p className="text-sm text-secondary mt-3 line-clamp-2">{draft.excerpt}</p>
              </div>
              <div className="space-y-3 mt-4 pt-4 border-t border-slate-700/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">{draft.category}</span>
                  <span className="text-warning font-medium">In Progress</span>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/brain?edit=${draft.id}`} className="flex-1 px-3 py-2 rounded text-xs font-medium bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 transition">
                    Continue
                  </Link>
                  <button className="flex-1 px-3 py-2 rounded text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-red-500/30 hover:text-red-300 transition">
                    Delete
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
