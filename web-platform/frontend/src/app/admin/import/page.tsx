"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb";
import { adminFetch } from "@/components/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function AdminImportPage() {
  const { token } = useAdminAuth();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

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
      toast.success(`Imported ${data.imported} items`);
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
          <p className="eyebrow">Imports</p>
          <h1>Bulk Import</h1>
          <p className="muted">Upload CSV, XLSX, or PDF files to add items to AI Memory.</p>
        </div>
      </section>

      <div className="admin-panel max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 font-medium">File</label>
            <input
              type="file"
              accept=".csv,.xlsx,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="primary-button">
              {loading ? "Uploading..." : "Upload"}
            </button>
            <button type="button" onClick={() => setFile(null)} className="ghost-button">
              Clear
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
