"use client";

import React, { useEffect, useState, useCallback } from "react";
import { adminFetch } from "@/components/api";
import { getAdminSessionToken } from "@/lib/adminSession";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ─── Brain Dashboard Types ──────────────────────────────────────
interface BrainStatus {
  soul_file_entries: number;
  total_syntheses: number;
  latest_synthesis_period: string | null;
  latest_synthesis_at: string | null;
  latest_synthesis_snippet: string | null;
  approved_memories: number;
  synthesis_tokens_today: number;
  feed_last_pulled_at: string | null;
}

interface BrainDashboard {
  project: string;
  timestamp: string;
  brain: BrainStatus;
}

// ─── Soft pastel color constants ────────────────────────────────
const C = {
  blue: "#7eb8d4",
  green: "#7ec4a0",
  lav: "#b4a4cc",
  amber: "#c9a96a",
  dim: "rgba(255,255,255,0.18)",
  border: "rgba(255,255,255,0.08)",
  bg: "#161922",
};

function dot(color: string) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: color,
        marginRight: 6,
        opacity: 0.85,
        animation: "breathe 4s ease-in-out infinite",
      }}
    />
  );
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Brain Section Component ─────────────────────────────────────
function BrainSection() {
  const [data, setData] = useState<BrainDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getAdminSessionToken();
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/usage/brain-dashboard", token);
      if (!res.ok) throw new Error("Brain dashboard unavailable");
      const json = await res.json() as BrainDashboard;
      setData(json);
    } catch {
      setError("Brain dashboard could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function synthesizeNow() {
    const token = await getAdminSessionToken();
    if (!token) return;
    setSynthesizing(true);
    setActionMsg(null);
    try {
      const res = await adminFetch("/api/admin/brain/synthesize", token, { method: "POST" });
      if (res.ok) { setActionMsg("Synthesis started."); void load(); }
      else setActionMsg("Synthesis failed.");
    } catch { setActionMsg("Synthesis request error."); }
    finally { setSynthesizing(false); }
  }

  async function draftBlog() {
    const token = await getAdminSessionToken();
    if (!token) return;
    setDrafting(true);
    setActionMsg(null);
    try {
      const res = await adminFetch("/api/admin/brain/draft-blog", token, { method: "POST" });
      if (res.ok) { const d = await res.json(); setActionMsg(`Blog draft created: "${d.title}"`); }
      else setActionMsg("Blog draft failed.");
    } catch { setActionMsg("Blog draft request error."); }
    finally { setDrafting(false); }
  }

  const b = data?.brain;

  return (
    <section
      style={{
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        background: C.bg,
        padding: "24px 28px",
        marginTop: 28,
      }}
    >
      <style>{`@keyframes breathe{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: ".8px", textTransform: "uppercase", color: C.lav, marginBottom: 4 }}>
            Brain Soul Layer
          </p>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f8fafc", margin: 0 }}>Brain Status</h2>
          <p style={{ fontSize: 12, color: C.dim, marginTop: 3 }}>
            Context synthesis · memory · feed ingestion
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={synthesizeNow}
            disabled={synthesizing}
            style={{
              background: "transparent",
              border: `1px solid ${C.green}`,
              color: C.green,
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 12,
              cursor: synthesizing ? "not-allowed" : "pointer",
              opacity: synthesizing ? 0.5 : 1,
            }}
          >
            {synthesizing ? "Running…" : "Synthesize Now"}
          </button>
          <button
            onClick={draftBlog}
            disabled={drafting}
            style={{
              background: "transparent",
              border: `1px solid ${C.blue}`,
              color: C.blue,
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 12,
              cursor: drafting ? "not-allowed" : "pointer",
              opacity: drafting ? 0.5 : 1,
            }}
          >
            {drafting ? "Drafting…" : "Generate Blog Draft"}
          </button>
        </div>
      </div>

      {actionMsg && (
        <div style={{ marginBottom: 16, padding: "8px 14px", borderRadius: 8, background: "rgba(126,196,160,0.08)", border: `1px solid rgba(126,196,160,0.2)`, fontSize: 12, color: C.green }}>
          {actionMsg}
        </div>
      )}

      {loading ? (
        <div style={{ color: C.dim, fontSize: 13 }}>Loading brain status…</div>
      ) : error ? (
        <div style={{ color: "#f87171", fontSize: 13 }}>{error}</div>
      ) : b ? (
        <>
          {/* Stat grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Soul Entries", value: b.soul_file_entries, color: C.blue },
              { label: "Total Syntheses", value: b.total_syntheses, color: C.green },
              { label: "Approved Memories", value: b.approved_memories, color: C.lav },
              { label: "Tokens Today", value: b.synthesis_tokens_today.toLocaleString(), color: C.amber },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "14px 16px",
                }}
              >
                <p style={{ fontSize: 11, color: C.dim, marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Meta row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: C.dim }}>
              <span style={{ color: C.lav, marginRight: 6 }}>Latest Period</span>
              {b.latest_synthesis_period ?? "—"}
            </div>
            <div style={{ fontSize: 12, color: C.dim }}>
              <span style={{ color: C.lav, marginRight: 6 }}>Synthesized At</span>
              {fmt(b.latest_synthesis_at)}
            </div>
            <div style={{ fontSize: 12, color: C.dim }}>
              <span style={{ color: C.amber, marginRight: 6 }}>Feed Pulled At</span>
              {fmt(b.feed_last_pulled_at)}
            </div>
          </div>

          {/* Synthesis snippet */}
          {b.latest_synthesis_snippet && (
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${C.lav}`,
                borderRadius: "0 8px 8px 0",
                padding: "12px 16px",
                fontSize: 12,
                color: C.dim,
                lineHeight: 1.7,
              }}
            >
              {dot(C.lav)}
              <span style={{ color: "#cbd5e1" }}>{b.latest_synthesis_snippet}</span>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}

export default function UsagePage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadUsage() {
      const token = await getAdminSessionToken();
      if (!token || cancelled) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await adminFetch("/api/admin/usage", token);
        const json = await response.json();
        const items = (json.usage_by_key as Record<string, unknown>[]) || [];
        setRows(items);
      } catch (err) {
        console.error("Usage load error:", err);
        setError("Could not load usage data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadUsage();
    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = rows.map((r) => ({
    name: (r.api_key_name as string) || (r.provider as string) || "unknown",
    tokens: Number((r.tokens as number) || 0),
    cost: Number((r.cost as number) || 0),
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">API Usage</h1>
        <p className="mt-1 text-sm text-slate-400">Usage and cost by provider and key.</p>
      </header>

      {loading ? (
        <div className="text-slate-300">Loading...</div>
      ) : error ? (
        <div className="text-red-300">{error}</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="text-lg font-semibold text-white">Usage by key</h2>
            <div className="mt-4 overflow-x-auto rounded-lg bg-slate-900 p-2">
              <table className="w-full table-auto text-sm">
                <thead>
                  <tr className="text-slate-400">
                    <th className="px-3 py-2 text-left">Provider</th>
                    <th className="px-3 py-2 text-left">API Key</th>
                    <th className="px-3 py-2 text-right">Tokens</th>
                    <th className="px-3 py-2 text-right">Cost</th>
                    <th className="px-3 py-2 text-right">Calls</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${String(r.provider)}-${String(r.api_key_name)}`} className="border-t border-slate-800 hover:bg-slate-800/40 transition">
                      <td className="px-3 py-2 text-slate-200">{String(r.provider)}</td>
                      <td className="px-3 py-2 text-slate-200">{String(r.api_key_name)}</td>
                      <td className="px-3 py-2 text-right text-slate-200">{Number(r.tokens || 0)}</td>
                      <td className="px-3 py-2 text-right text-slate-200">${Number(r.cost || 0).toFixed(4)}</td>
                      <td className="px-3 py-2 text-right text-slate-200">{Number(r.calls || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="text-lg font-semibold text-white">Token usage & cost</h2>
            <div style={{ width: '100%', height: 360 }} className="mt-4">
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid stroke="#1f2937" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8' }} />
                  <YAxis tick={{ fill: '#94a3b8' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="tokens" fill="#06b6d4" />
                  <Bar dataKey="cost" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <BrainSection />
    </div>
  );
}
