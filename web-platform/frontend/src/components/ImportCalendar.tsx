"use client";

import { ChangeEvent, useState } from "react";
import { toast } from "sonner";

import { adminFetch } from "./api";

const categories = ["Supply Chain", "Logistics", "Procurement", "Operations Excellence", "News"];

function normalizeRows(rows: Record<string, unknown>[]) {
  return rows.map((row) => {
    const record = Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), String(value || "").trim()]),
    ) as Record<string, string>;
    const category = categories.includes(record.category) ? record.category : "Supply Chain";
    return {
      title: record.title || "Imported Draft",
      slug: record.slug || undefined,
      category,
      excerpt: record.excerpt || "",
      content_html: record.content_html || record.content || "<p>Draft imported from calendar file.</p>",
    };
  });
}

function parseCsv(text: string) {
  const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split(",").map((item) => item.trim());
  return normalizeRows(
    lines.map((line) => {
      const cells = line.split(",").map((item) => item.trim());
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = cells[index] || "";
      });
      return record;
    }),
  );
}

export default function ImportCalendar({
  token,
}: {
  token: string;
}) {
  const [fileName, setFileName] = useState("");

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setFileName(file.name);
    let records;
    if (file.name.endsWith(".xlsx")) {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      records = normalizeRows(XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet));
    } else {
      records = parseCsv(await file.text());
    }
    const response = await adminFetch("/api/admin/posts/import", token, {
      method: "POST",
      body: JSON.stringify({ records }),
    });
    const result = await response.json();
    toast.success(`${result.imported} draft records imported.`);
  }

  return (
    <section className="admin-panel import-panel">
      <p className="eyebrow">Import Calendar</p>
      <h2>Excel Bulk Import</h2>
      <p className="muted">
        Drop in a CSV export with columns: title, category, excerpt, content_html, slug. Imported rows are staged as drafts.
      </p>
      <label className="drop-zone">
        <span>{fileName || "Browse or drop .csv / .xlsx file"}</span>
        <input type="file" accept=".csv,.xlsx" onChange={handleFile} />
      </label>
    </section>
  );
}
