"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb";
import { adminFetch } from "@/components/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";

type Preview = { items: number; records: Array<{ title: string; content: string; category: string }> };

export default function AdminImportPage() {
  const { token } = useAdminAuth();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);

  async function handlePreview() {
    if (!file || !token) return toast.error("Admin session required");
    const form = new FormData();
    form.append("file", file, file.name);
    try {
      const res = await adminFetch("/api/admin/imports/preview", token, { method: "POST", body: form });
      setPreview(await res.json());
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Preview failed");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Please choose a file to import");
    if (!token) return toast.error("Admin session required");
    const form = new FormData();
    form.append("file", file, file.name);
    try {
      setLoading(true);
      const res = await adminFetch("/api/admin/imports", token, { method: "POST", body: form });
      const data = await res.json();
      toast.success(`Imported ${data.imported} items; ${data.duplicates?.length || 0} duplicates skipped`);
      setPreview(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <AdminBreadcrumb currentPage="Bulk Import" />
      <section className="agent-header">
        <div>
          <p className="eyebrow">Knowledge Intake</p>
          <h1>Bulk Import</h1>
          <p className="muted">Upload JSON, CSV, Markdown, TXT, or HTML. Files are validated and previewed before storage.</p>
        </div>
      </section>
      <div className="admin-panel max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="file" accept=".json,.csv,.md,.markdown,.txt,.html,.htm" onChange={(e) => { setFile(e.target.files?.[0] || null); setPreview(null); }} className="w-full" />
          <div className="flex gap-2">
            <button type="button" onClick={handlePreview} disabled={!file} className="ghost-button">Preview</button>
            <button type="submit" disabled={!file || loading} className="primary-button">{loading ? "Importing..." : "Import"}</button>
            <button type="button" onClick={() => { setFile(null); setPreview(null); }} className="ghost-button">Clear</button>
          </div>
        </form>
        {preview ? (
          <div className="mt-6 rounded-lg border border-slate-800 p-4">
            <p className="eyebrow">Validated preview · {preview.items} item(s)</p>
            <div className="mt-3 space-y-2">
              {preview.records.slice(0, 10).map((record, index) => (
                <div key={`${record.title}-${index}`} className="rounded border border-slate-800 p-3">
                  <strong>{record.title}</strong><span className="ml-2 text-xs text-slate-400">{record.category}</span>
                  <p className="mt-1 text-sm text-slate-400">{record.content.slice(0, 180)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
