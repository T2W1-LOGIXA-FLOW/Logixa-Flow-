"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, CheckCircle2, Cloud, Database, Mail, MessageCircle, Network, Power, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { getAdminSessionToken } from "@/lib/adminSession";

type Integration = {
  id: string;
  name: string;
  category: string;
  description: string;
  configured: boolean;
  missing_requirements: number;
  enabled: boolean;
  availability_scope: "workflow_library";
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function integrationRequest(path: string, init?: RequestInit) {
  const token = await getAdminSessionToken();
  if (!token) throw new Error("An admin session is required.");
  const response = await fetch(new URL(path, API_BASE || window.location.origin), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(typeof payload?.detail === "string" ? payload.detail : "Integration request failed.");
  }
  return response.json();
}

const categoryIcons: Record<string, typeof Cloud> = {
  AI: Sparkles,
  Storage: Database,
  Productivity: Cloud,
  Messaging: MessageCircle,
  Automation: Network,
};

export default function AdminIntegrationsPage() {
  const [items, setItems] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await integrationRequest("/api/admin/integrations/catalog");
      setItems(payload.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load integrations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(items.map((item) => item.category)))], [items]);
  const visibleItems = useMemo(() => items.filter((item) => filter === "All" || item.category === filter), [items, filter]);
  const configuredCount = items.filter((item) => item.configured).length;
  const enabledCount = items.filter((item) => item.enabled).length;

  const toggle = async (item: Integration) => {
    if (!item.configured || savingId) return;
    setSavingId(item.id);
    setNotice(null);
    setError(null);
    try {
      const updated = await integrationRequest(`/api/admin/integrations/catalog/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !item.enabled }),
      });
      setItems((current) => current.map((entry) => entry.id === item.id ? updated : entry));
      setNotice(`${item.name} ${updated.enabled ? "enabled" : "disabled"} in the workflow library.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update integration.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">Connections &amp; capabilities</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Integration Center</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Manage which configured services are available when building workflows. Connect provider credentials once at the server level, then control workflow availability here.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 hover:border-cyan-500/60 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Integration summary">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs text-slate-400">Catalog entries</p><p className="mt-2 text-2xl font-semibold text-white">{items.length}</p></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs text-slate-400">Credentials configured</p><p className="mt-2 text-2xl font-semibold text-white">{configuredCount}</p></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs text-slate-400">Available in workflow library</p><p className="mt-2 text-2xl font-semibold text-white">{enabledCount}</p></div>
      </section>

      <div className="flex flex-wrap items-center gap-2" aria-label="Filter integrations">
        {categories.map((category) => <button key={category} type="button" onClick={() => setFilter(category)} aria-pressed={filter === category} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${filter === category ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200" : "border-slate-700 text-slate-400 hover:text-white"}`}>{category}</button>)}
      </div>

      {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-200"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div>}

      {loading ? <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-400">Loading integration readiness…</div> : (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((item) => {
            const Icon = categoryIcons[item.category] ?? Activity;
            return (
              <article key={item.id} className="flex min-h-52 flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-950 text-cyan-300"><Icon className="h-5 w-5" /></span>
                    <div className="min-w-0"><h2 className="truncate text-sm font-semibold text-white">{item.name}</h2><p className="mt-0.5 text-xs text-slate-500">{item.category}</p></div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${item.configured ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>{item.configured ? "Configured" : "Setup required"}</span>
                </div>
                <p className="mt-4 text-sm leading-5 text-slate-400">{item.description}</p>
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-800 pt-4">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-300">{item.enabled ? "Available to workflows" : "Unavailable to workflows"}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{item.configured ? "Server credentials detected" : `${item.missing_requirements} credential requirement(s) missing`}</p>
                  </div>
                  <button type="button" role="switch" aria-checked={item.enabled} aria-label={`${item.enabled ? "Disable" : "Enable"} ${item.name} in workflow library`} disabled={!item.configured || savingId !== null} onClick={() => void toggle(item)} className={`relative h-7 w-12 shrink-0 rounded-full border transition disabled:cursor-not-allowed disabled:opacity-40 ${item.enabled ? "border-emerald-400/60 bg-emerald-500/30" : "border-slate-600 bg-slate-800"}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${item.enabled ? "left-[23px]" : "left-0.5"}`} />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <aside className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
        <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><div><h2 className="text-sm font-semibold text-amber-100">Important: scope of these switches</h2><p className="mt-1 text-xs leading-5 text-amber-100/70">These switches control availability in the workflow module library only. They do not revoke OAuth grants, delete credentials, stop existing background jobs, or disable a provider globally. A provider marked Configured has server credentials present; it has not necessarily passed a live connectivity test. Secrets are never returned to this page.</p></div></div>
      </aside>
    </main>
  );
}
