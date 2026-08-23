"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { EnvProviderStatus, SystemStatus, adminFetch } from "@/components/api";
import Skeleton from "@/components/shadcn/Skeleton";
import IntegrationTriggers from "@/components/IntegrationTriggers";
import { getAdminSessionToken } from "@/lib/adminSession";

export default function AdminSystemPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [frontendProviders, setFrontendProviders] = useState<EnvProviderStatus[]>([]);
  const [message, setMessage] = useState("");

  async function loadStatus(savedToken: string) {
    const response = await adminFetch("/api/admin/system/status", savedToken);
    setStatus((await response.json()) as SystemStatus);

    // Use adminFetch for the frontend env-status so proper auth headers are included
    const frontendResponse = await adminFetch("/api/admin/env-status", savedToken);
    if (frontendResponse.ok) {
      const data = (await frontendResponse.json()) as { providers: EnvProviderStatus[] };
      setFrontendProviders(data.providers);
    }
  }
  useEffect(() => {
    const saved = getAdminSessionToken();
    if (!saved) {
      router.push("/admin/login");
      return;
    }
    setToken(saved);
    loadStatus(saved).catch(() => setMessage("System status could not be loaded."));
  }, [router]);

  async function runDailyPreview() {
    setMessage("Running daily preview agent...");
    try {
      const response = await adminFetch("/api/admin/system/run-daily-preview", token, { method: "POST" });
      const data = (await response.json()) as { memory_id: number | null };
      setMessage(`Daily preview created in brain queue: #${data.memory_id}`);
      await loadStatus(token);
    } catch {
      setMessage("Daily preview run failed.");
    }
  }

  if (!token) {
    return (
      <main className="page-shell brain-review-page">
        <div className="max-w-4xl mx-auto py-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 w-3/4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-8 w-1/3" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell brain-review-page">
      <section className="agent-header">
        <div>
          <p className="eyebrow">System</p>
          <h1>Operations Status</h1>
          <p className="muted">Environment, scheduler, AI key, and workflow counts.</p>
        </div>
        <Link className="ghost-button" href="/admin">
          Admin
        </Link>
      </section>

      {message ? <p className="admin-status">{message}</p> : null}

      <section className="admin-metric-grid">
        <article className="admin-metric-card cyan card-gradient-hover">
          <span>AI Key</span>
          <strong>{status?.ai_key_configured ? "Ready" : "Local"}</strong>
        </article>
        <article className="admin-metric-card orange card-gradient-hover">
          <span>Scheduler</span>
          <strong>{status?.scheduler_enabled ? "On" : "Off"}</strong>
        </article>
        <article className="admin-metric-card cyan card-gradient-hover">
          <span>Sources</span>
          <strong>{status?.counts.sources ?? 0}</strong>
        </article>
        <article className="admin-metric-card orange card-gradient-hover">
          <span>Pending</span>
          <strong>{status?.counts.pending_brain ?? 0}</strong>
        </article>
        <article className="admin-metric-card cyan card-gradient-hover">
          <span>Agent Runs</span>
          <strong>{status?.counts.agent_runs ?? 0}</strong>
        </article>
        <article className="admin-metric-card orange card-gradient-hover">
          <span>Published</span>
          <strong>{status?.counts.published_posts ?? 0}</strong>
        </article>
        <article className="admin-metric-card cyan card-gradient-hover">
          <span>Cache</span>
          <strong>{status?.cache_backend ?? "unknown"}</strong>
        </article>
        <article className="admin-metric-card orange card-gradient-hover">
          <span>Rate Limit</span>
          <strong>{status?.rate_limit_backend ?? "unknown"}</strong>
        </article>
      </section>

      <section className="admin-panel">
        <p className="eyebrow">Provider Health</p>
        <h2>API keys and service configuration</h2>
        <p className="muted">Backend process checks. Secret values are never exposed.</p>
        <div className="mt-4 flex gap-4 items-center">
          {status?.active_provider && (
            <div className="px-3 py-2 rounded bg-slate-900 border border-slate-700">
              <div className="text-xs text-slate-400">Active Provider</div>
              <div className="font-semibold text-white">{status.active_provider}</div>
            </div>
          )}
          {status?.active_model && (
            <div className="px-3 py-2 rounded bg-slate-900 border border-slate-700">
              <div className="text-xs text-slate-400">Active Model</div>
              <div className="font-semibold text-white">{status.active_model}</div>
            </div>
          )}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(status?.providers || []).map((provider) => (
            <article
              key={provider.key}
              className={`rounded-xl border p-4 ${
                provider.state === "ready"
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : provider.state === "missing"
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-slate-700/60 bg-slate-900/40"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-white">{provider.label}</h3>
                  <p className="mt-1 text-xs text-slate-400">{provider.env}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                    provider.state === "ready"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : provider.state === "missing"
                        ? "bg-red-500/15 text-red-300"
                        : "bg-slate-700/60 text-slate-300"
                  }`}
                >
                  {provider.state}
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-300">
                {provider.configured
                  ? "Configured without exposing the secret value."
                  : provider.required
                    ? "Required before production use."
                    : "Optional. The system can continue with fallback behavior."}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-panel">
        <p className="eyebrow">Frontend Environment</p>
        <h2>Payments, email, and public runtime</h2>
        <p className="muted">Next.js runtime checks for Stripe, email, and public URL configuration.</p>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {frontendProviders.map((provider) => (
            <article
              key={provider.key}
              className={`rounded-xl border p-4 ${
                provider.state === "ready"
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : provider.state === "missing"
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-slate-700/60 bg-slate-900/40"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-white">{provider.label}</h3>
                  <p className="mt-1 text-xs text-slate-400">{provider.env}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                    provider.state === "ready"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : provider.state === "missing"
                        ? "bg-red-500/15 text-red-300"
                        : "bg-slate-700/60 text-slate-300"
                  }`}
                >
                  {provider.state}
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-300">
                {provider.configured
                  ? "Configured without exposing the secret value."
                  : provider.required
                    ? "Required before production use."
                    : "Optional until this integration is active."}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-panel">
        <p className="eyebrow">Controls</p>
        <h2>Manual jobs</h2>
        <button className="primary-button" type="button" onClick={runDailyPreview}>
          Run Daily Preview Agent
        </button>
      </section>

      <section className="admin-panel">
        <IntegrationTriggers token={token} />
      </section>

      <section className="admin-panel">
        <p className="eyebrow">Environment</p>
        <h2>Required configuration</h2>
        {status?.missing_env.length ? (
          <div className="system-warning-list">
            {status.missing_env.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        ) : (
          <p className="muted">Required environment variables are configured.</p>
        )}
      </section>
    </main>
  );
}
