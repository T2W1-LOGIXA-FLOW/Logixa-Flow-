"use client";

import { ChangeEvent, useState } from "react";
import { toast } from "sonner";

import { adminFetch } from "./api";

export default function ImportCalendar({
  token: string;
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

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await adminFetch("/api/admin/imports", token, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      toast.success(`${result.imported} draft records imported.`);
    } catch {
      toast.error("Import failed. Please check the file format and try again.");
    }
  }

  return (
    <section className="admin-panel import-panel">
      <p className="eyebrow">Import Calendar</p>
      <h2>Spreadsheet & File Import</h2>
      <p className="muted">
        Drop in a CSV, XLSX, or PDF file. The backend parses the file and stages imported records as drafts.
      </p>
      <label className="drop-zone">
        <span>{fileName || "Browse or drop .csv / .xlsx / .pdf file"}</span>
        <input type="file" accept=".csv,.xlsx,.pdf" onChange={handleFile} />
      </label>
    </section>
  );
}
