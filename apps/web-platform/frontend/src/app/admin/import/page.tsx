"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb";
import { adminFetch } from "@/components/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";

type Preview = { items: number; records: Array<{ title: string; content: string; category: string }> };

export default function AdminImportPage() {
  const { token } = useAdminAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  async function handlePreview() {
    if (files.length === 0 || !token) return toast.error("Admin session required and at least one file selected");
    const primary = files[0];
    const form = new FormData();
    form.append("file", primary, primary.name);
    try {
      const res = await adminFetch("/api/admin/imports/preview", token, { method: "POST", body: form });
      setPreview(await res.json());
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Preview failed");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return toast.error("Please choose at least one file to import");
    if (!token) return toast.error("Admin session required");

    setLoading(true);
    let totalImported = 0;
    let totalSkipped = 0;
    let failedCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgressText(`Processing ${i + 1}/${files.length}: ${file.name}`);
        const form = new FormData();
        form.append("file", file, file.name);

        try {
          const res = await adminFetch("/api/admin/imports", token, { method: "POST", body: form });
          if (res.ok) {
            const data = await res.json();
            totalImported += (data.imported || 0);
            totalSkipped += (data.duplicates?.length || 0);
          } else {
            failedCount++;
          }
        } catch {
          failedCount++;
        }
      }

      if (failedCount === 0) {
        toast.success(`Bulk import completed: ${totalImported} items imported across ${files.length} file(s); ${totalSkipped} duplicates skipped.`);
      } else {
        toast.warning(`Bulk import finished with warnings: ${totalImported} items imported; ${failedCount} file(s) failed.`);
      }
      setFiles([]);
      setPreview(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Bulk import failed");
    } finally {
      setLoading(false);
      setProgressText(null);
    }
  }

  return (
    <main className="page-shell">
      <AdminBreadcrumb currentPage="Bulk Import" />
      <section className="agent-header">
        <div>
          <p className="eyebrow">Knowledge Intake</p>
          <h1>Bulk Import</h1>
          <p className="muted">Upload multiple JSON, CSV, Markdown, TXT, or HTML files at once. Files are validated and processed in bulk.</p>
        </div>
      </section>
      <div className="admin-panel max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="file"
            multiple
            accept=".json,.csv,.md,.markdown,.txt,.html,.htm"
            onChange={(e) => {
              const selected = Array.from(e.target.files || []);
              setFiles(selected);
              setPreview(null);
            }}
            className="w-full"
            disabled={loading}
          />
          {files.length > 0 && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-300">
              <p className="font-semibold text-slate-200">
                📦 {files.length} file{files.length > 1 ? "s" : ""} selected for bulk intake:
              </p>
              <ul className="mt-1.5 max-h-32 space-y-1 overflow-y-auto font-mono text-[11px] text-slate-400">
                {files.map((f, idx) => (
                  <li key={`${f.name}-${idx}`} className="flex justify-between">
                    <span>{idx + 1}. {f.name}</span>
                    <span>{(f.size / 1024).toFixed(1)} KB</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {progressText && (
            <div className="text-xs text-purple-400 font-medium animate-pulse">
              ⏳ {progressText}
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={handlePreview} disabled={files.length === 0 || loading} className="ghost-button">
              Preview First
            </button>
            <button type="submit" disabled={files.length === 0 || loading} className="primary-button">
              {loading ? "Bulk Importing..." : `Bulk Import (${files.length} file${files.length !== 1 ? "s" : ""})`}
            </button>
            <button type="button" onClick={() => { setFiles([]); setPreview(null); }} disabled={loading} className="ghost-button">
              Clear
            </button>
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
