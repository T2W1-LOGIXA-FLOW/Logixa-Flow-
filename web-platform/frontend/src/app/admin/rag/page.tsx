"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb";
import { adminFetch } from "@/components/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";

type Source = {
  id: number; title: string; url?: string | null; category: string;
  trust_score: number; knowledge_status: string; publication_status: string;
  source_version: number; indexing_status: string; indexed_at?: string | null;
  indexing_error?: string | null; freshness_score: number;
};

export default function RagIndexPage() {
  const { token, isAuthenticated } = useAdminAuth();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
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
  }

  useEffect(() => { if (isAuthenticated && token) load(); }, [isAuthenticated, token]);

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

  if (!isAuthenticated) return null;

  return (
    <main className="page-shell">
      <AdminBreadcrumb currentPage="RAG Index" />
      <section className="agent-header">
        <div>
          <p className="eyebrow">Knowledge</p>
          <h1>RAG Index</h1>
          <p className="muted">Track source lifecycle, indexing state, freshness, and re-index operations.</p>
        </div>
      </section>
      <section className="admin-panel overflow-x-auto">
        {loading ? <p className="muted">Loading sources...</p> : sources.length === 0 ? (
          <p className="muted">No knowledge sources yet. Use Import to add JSON, CSV, Markdown, TXT, or HTML.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-800 text-left text-slate-400">
              <th className="p-3">Source</th><th className="p-3">Knowledge</th><th className="p-3">Index</th><th className="p-3">Freshness</th><th className="p-3">Actions</th>
            </tr></thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.id} className="border-b border-slate-900">
                  <td className="p-3"><strong>{source.title}</strong><div className="text-xs text-slate-500">{source.category} · v{source.source_version}</div></td>
                  <td className="p-3">{source.knowledge_status}</td>
                  <td className="p-3"><span className={source.indexing_status === "indexed" ? "text-emerald-400" : "text-amber-300"}>{source.indexing_status}</span>{source.indexing_error ? <div className="text-xs text-red-400">{source.indexing_error}</div> : null}</td>
                  <td className="p-3">{Math.round(source.freshness_score * 100)}%</td>
                  <td className="p-3"><button className="ghost-button mr-2" disabled={busy === source.id} onClick={() => reindex(source.id)}>Re-index</button><button className="ghost-button danger" disabled={busy === source.id} onClick={() => remove(source.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
