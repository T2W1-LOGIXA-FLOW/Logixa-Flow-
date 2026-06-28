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

export default function AdminArticlesPage() {
  const { token, isAuthenticated } = useAdminAuth();
  const [articles, setArticles] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadArticles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminFetch("/api/posts?status=published", token);
      const data = await response.json();
      setArticles(Array.isArray(data) ? data : []);
      setError(null);
    } catch {
      setError("Failed to load articles");
      toast.error("Could not load articles");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }
    loadArticles();
  }, [token, isAuthenticated, loadArticles]);

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
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
      <AdminBreadcrumb currentPage="Articles" />

      <section className="agent-header">
        <div>
          <p className="eyebrow">Content Management</p>
          <AnimatedText
            text="Published Articles"
            gradientColors="linear-gradient(90deg, #10b981, #ffffff, #0891b2)"
            gradientAnimationDuration={1.5}
            hoverEffect={true}
            textClassName="font-black text-3xl md:text-4xl"
            className="py-0"
          />
          <p className="text-muted">All published articles and insights</p>
        </div>
        <Link className="ghost-button inline-flex items-center gap-2" href="/admin/agent-chat">
          <Plus className="h-4 w-4" />
          New Article
        </Link>
      </section>

      {error && <p className="admin-status error">{error}</p>}

      <AdminSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search articles..."
      />

      {loading ? (
        <AdminGridSkeleton />
      ) : filteredArticles.length === 0 ? (
        <AdminEmptyState
          title={searchQuery ? "No articles found" : "No published articles found"}
          description={searchQuery ? "No articles found matching your search" : "Create your first published article"}
          actionLabel="Create Article with AI"
          actionHref="/admin/agent-chat"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => (
            <div key={article.id} className="admin-panel group flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <p className="eyebrow text-cyan-400">{article.type}</p>
                <span className="text-xs px-3 py-1 bg-green-500/20 text-green-300 rounded-full font-medium">Published</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-primary group-hover:text-cyan-300 transition line-clamp-2">{article.title}</h3>
                <p className="text-sm text-secondary mt-3 line-clamp-2">{article.excerpt}</p>
              </div>
              <div className="space-y-3 mt-4 pt-4 border-t border-slate-700/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">{article.category}</span>
                  <span className="text-soft">{new Date(article.published_at || "").toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2">
                  <Link href={`/blog/${article.slug}`} className="flex-1 px-3 py-2 rounded text-xs font-medium bg-green-500/20 text-green-300 hover:bg-green-500/30 transition">
                    Read
                  </Link>
                  <button className="flex-1 px-3 py-2 rounded text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition">
                    Archive
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
