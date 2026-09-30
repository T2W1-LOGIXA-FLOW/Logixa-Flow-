"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb";
import { adminFetch } from "@/components/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function AdminImportPage() {
  const { token } = useAdminAuth();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);\n  const [preview, setPreview] = useState<{ items: number; records: Array<{ title: string; content: string; category: string }> } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Please choose a file to import");
    if (!token) return toast.error("Admin session required");

    const form = new FormData();
    form.append("file", file, file.name);

    try {
      setLoading(true);
      const res = await adminFetch("/api/admin/imports", token, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      toast.success(`Imported ${data.imported} items; ${data.duplicates?.length || 0} duplicates skipped`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  async function handlePreview() {\n    if (!file || !token) return;\n    const form = new FormData();\n    form.append("file", file, file.name);\n    try {\n      const res = await adminFetch("/api/admin/imports/preview", token, { method: "POST", body: form });\n      setPreview(await res.json());\n    } catch (err: unknown) {\n      toast.error(err instanceof Error ? err.message : "Preview failed");\n    }\n  }\n\n  return (
    <main className="page-shell">
      <AdminBreadcrumb currentPage="Bulk Import" />
      <section className="agent-header">
        <div>
          <p className="eyebrow">Imports</p>
          <h1>Bulk Import</h1>
          <p className="muted">Upload JSON, CSV, Markdown, TXT, or HTML files into the Knowledge source registry. Preview and validation happen before records are stored.</p>
        </div>
      </section>

      <div className="admin-panel max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 font-medium">File</label>
            <input
              type="file"
              accept=".json,.csv,.md,.markdown,.txt,.html,.htm"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={!file || loading}
              aria-disabled={!file || loading}
              className="w-full py-3 rounded-md font-semibold shadow-md flex items-center justify-center"
              style={{ backgroundColor: "#22D3EE", color: "#000" }}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin mr-2 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                "Upload File"
              )}
            </button>

            <div className="mt-3 flex justify-end">
              <button type="button" onClick={() => setFile(null)} className="ghost-button">
                Clear
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
