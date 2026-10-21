"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { adminFetch } from "@/components/api";
import { getAdminSessionToken } from "@/lib/adminSession";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  BarChart3,
  Cpu,
  Database,
  DollarSign,
  Layers,
  Sparkles,
  RefreshCw,
  FileText,
  Activity,
  Zap,
} from "lucide-react";

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
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/usage/brain-dashboard", token);
      if (!res.ok) throw new Error("Brain dashboard unavailable");
      const json = (await res.json()) as BrainDashboard;
      setData(json);
    } catch {
      setError("Brain dashboard could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function synthesizeNow() {
    const token = await getAdminSessionToken();
    if (!token) return;
    setSynthesizing(true);
    setActionMsg(null);
    try {
      const res = await adminFetch("/api/admin/brain/synthesize", token, { method: "POST" });
      if (res.ok) {
        setActionMsg("Synthesis started successfully.");
        void load();
      } else {
        setActionMsg("Synthesis trigger failed.");
      }
    } catch {
      setActionMsg("Synthesis request error.");
    } finally {
      setSynthesizing(false);
    }
  }

  async function draftBlog() {
    const token = await getAdminSessionToken();
    if (!token) return;
    setDrafting(true);
    setActionMsg(null);
    try {
      const res = await adminFetch("/api/admin/brain/draft-blog", token, { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setActionMsg(`Blog draft created: "${d.title}"`);
      } else {
        setActionMsg("Blog draft generation failed.");
      }
    } catch {
      setActionMsg("Blog draft request error.");
    } finally {
      setDrafting(false);
    }
  }

  const b = data?.brain;

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-violet-400">
              Brain Soul Layer
            </span>
          </div>
          <h2 className="mt-1 text-xl sm:text-2xl font-bold text-white">Brain Status</h2>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-400">
            Real-time context synthesis · Long-term soul memory · Knowledge feed ingestion
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={synthesizeNow}
            disabled={synthesizing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {synthesizing ? "Running…" : "Synthesize Now"}
          </button>
          <button
            onClick={draftBlog}
            disabled={drafting}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 active:scale-95 transition disabled:opacity-50"
          >
            <FileText className="h-3.5 w-3.5" />
            {drafting ? "Drafting…" : "Generate Blog Draft"}
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-300">
          {actionMsg}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-xs sm:text-sm text-slate-400">Loading brain status…</div>
      ) : error ? (
        <div className="py-8 text-center text-xs sm:text-sm text-rose-400">{error}</div>
      ) : b ? (
        <div className="space-y-5">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 sm:p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Soul Entries</span>
              <p className="mt-1 text-2xl font-extrabold text-cyan-400">{b.soul_file_entries}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Core memory nodes</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 sm:p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Syntheses</span>
              <p className="mt-1 text-2xl font-extrabold text-emerald-400">{b.total_syntheses}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Knowledge cycles run</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 sm:p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Approved Memories</span>
              <p className="mt-1 text-2xl font-extrabold text-violet-400">{b.approved_memories}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Passed human review</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 sm:p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tokens Today</span>
              <p className="mt-1 text-2xl font-extrabold text-amber-400">{b.synthesis_tokens_today.toLocaleString()}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">AI tokens processed</p>
            </div>
          </div>

          {/* Timestamps Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-300">
            <div>
              <span className="font-semibold text-cyan-400 block mb-0.5">Latest Synthesis Period:</span>
              <span className="font-mono">{b.latest_synthesis_period ?? "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-emerald-400 block mb-0.5">Synthesized At:</span>
              <span className="font-mono">{fmt(b.latest_synthesis_at)}</span>
            </div>
            <div>
              <span className="font-semibold text-amber-400 block mb-0.5">Feed Last Ingested:</span>
              <span className="font-mono">{fmt(b.feed_last_pulled_at)}</span>
            </div>
          </div>

          {/* Synthesis snippet */}
          {b.latest_synthesis_snippet && (
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-4 border-l-4 border-l-violet-500 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <strong className="block text-violet-300 text-xs font-semibold uppercase tracking-wider mb-1">
                Latest Memory Synthesis Insight:
              </strong>
              {b.latest_synthesis_snippet}
            </div>
          )}
        </div>
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

  const chartData = useMemo(() => {
    return rows.map((r) => ({
      name: (r.api_key_name as string) || (r.provider as string) || "unknown",
      tokens: Number((r.tokens as number) || 0),
      cost: Number((r.cost as number) || 0),
      calls: Number((r.calls as number) || 0),
    }));
  }, [rows]);

  const totalTokens = useMemo(() => rows.reduce((acc, r) => acc + Number(r.tokens || 0), 0), [rows]);
  const totalCost = useMemo(() => rows.reduce((acc, r) => acc + Number(r.cost || 0), 0), [rows]);
  const totalCalls = useMemo(() => rows.reduce((acc, r) => acc + Number(r.calls || 0), 0), [rows]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              Operations & Economics
            </span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">API Usage & Costs</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Real-time inference tracking, token consumption by provider key, and system economics.
          </p>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-lg backdrop-blur-md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Tokens</span>
          <p className="mt-2 text-2xl font-extrabold text-cyan-400">{totalTokens.toLocaleString()}</p>
          <p className="mt-0.5 text-xs text-slate-500">All connected models</p>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-lg backdrop-blur-md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Estimated Cost</span>
          <p className="mt-2 text-2xl font-extrabold text-emerald-400">${totalCost.toFixed(4)}</p>
          <p className="mt-0.5 text-xs text-slate-500">API inference expense</p>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-lg backdrop-blur-md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total API Calls</span>
          <p className="mt-2 text-2xl font-extrabold text-violet-400">{totalCalls.toLocaleString()}</p>
          <p className="mt-0.5 text-xs text-slate-500">Dispatched requests</p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-12 text-center text-sm text-slate-400">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-cyan-400 mb-2" />
          Loading usage data from database...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-sm text-rose-300">
          {error}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Table: Usage by Key (7 cols on lg) */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Cpu className="h-4 w-4 text-cyan-400" />
                Usage by API Key
              </div>
              <span className="text-xs text-slate-500">{rows.length} keys active</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800/90 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-3">Provider</th>
                    <th className="py-3 px-3">API Key Name</th>
                    <th className="py-3 px-3 text-right">Tokens</th>
                    <th className="py-3 px-3 text-right">Cost</th>
                    <th className="py-3 px-3 text-right">Calls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rows.map((r) => (
                    <tr
                      key={`${String(r.provider)}-${String(r.api_key_name)}`}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <span className="inline-block rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-cyan-300">
                          {String(r.provider)}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-200">
                        {String(r.api_key_name)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-200">
                        {Number(r.tokens || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-400 font-semibold">
                        ${Number(r.cost || 0).toFixed(4)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300">
                        {Number(r.calls || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chart: Token Usage & Cost (5 cols on lg) */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <BarChart3 className="h-4 w-4 text-amber-400" />
                Token Distribution
              </div>
            </div>

            <div className="w-full h-[320px] pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "#f8fafc",
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "12px", fontSize: "11px" }} />
                  <Bar dataKey="tokens" name="Tokens" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="calls" name="Calls" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Brain Soul Layer Section */}
      <BrainSection />
    </div>
  );
}
