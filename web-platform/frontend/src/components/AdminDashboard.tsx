"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Brain,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  FileText,
  Gauge,
  PackageCheck,
  Plus,
  Server,
} from "lucide-react";
import Skeleton from "./shadcn/Skeleton";
import EmptyState from "./EmptyState";
import ErrorState from "./ErrorState";
import { DashboardMetric, Post, adminFetch, getMetrics } from "./api";
import ImportCalendar from "./ImportCalendar";
import InsightForm from "./InsightForm";
import { getAdminSessionToken } from "@/lib/adminSession";

type AdminView = "overview" | "create" | "drafts" | "import";

const dashboardTabs: { id: AdminView; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "create", label: "Create", icon: Plus },
  { id: "drafts", label: "Drafts", icon: FileText },
  { id: "import", label: "Import", icon: CalendarDays },
];

const commandModules = [
  {
    title: "Editorial Desk",
    description: "Create, stage, and review supply-chain insight content.",
    href: "/admin/insights",
    icon: FileText,
    accent: "cyan",
  },
  {
    title: "AI Brain",
    description: "Review private AI output before anything becomes public.",
    href: "/admin/brain",
    icon: Brain,
    accent: "violet",
  },
  {
    title: "Agent Control",
    description: "Run agents, check profiles, and inspect automation traces.",
    href: "/admin/agents",
    icon: Bot,
    accent: "emerald",
  },
  {
    title: "Finance & Costs",
    description: "Track free-stack status, API spend, and monthly planning.",
    href: "/admin/costs",
    icon: DollarSign,
    accent: "amber",
  },
  {
    title: "Operations",
    description: "Feeds, analytics, logistics estimator, and system checks.",
    href: "/admin/estimator",
    icon: PackageCheck,
    accent: "sky",
  },
  {
    title: "System Health",
    description: "Environment variables, provider readiness, and backend status.",
    href: "/admin/system",
    icon: Server,
    accent: "slate",
  },
];

const readiness = [
  { label: "Public site", value: "Stable", detail: "Keep user pages clean and fast." },
  { label: "Backend API", value: "Connected", detail: "Render service is the runtime source." },
  { label: "AI providers", value: "Ready", detail: "Gemini/OpenRouter/Groq fallback path." },
  { label: "Costs", value: "Planning", detail: "Track free tiers before paid scale." },
];

function metricValue(metrics: DashboardMetric[], key: string, fallback: string) {
  return metrics.find((metric) => metric.key === key)?.value || fallback;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [view, setView] = useState<AdminView>("overview");
  const [token, setToken] = useState("");
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [drafts, setDrafts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [draftsError, setDraftsError] = useState<string | null>(null);

  const statCards = useMemo(
    () => [
      {
        label: "Disruption Risk",
        value: metricValue(metrics, "disruption-risk", "Low"),
        detail: "Public signal card",
      },
      {
        label: "Demand Shift",
        value: metricValue(metrics, "market-demand", "+12%"),
        detail: "Market movement",
      },
      {
        label: "Port Congestion",
        value: metricValue(metrics, "port-congestion", "2.1d"),
        detail: "Logistics delay index",
      },
      {
        label: "Inventory Cover",
        value: metricValue(metrics, "inventory-cover", "38d"),
        detail: "Planning window",
      },
    ],
    [metrics],
  );

  const loadDashboard = async (authToken: string) => {
    setLoading(true);
    setMetricsError(null);
    try {
      const loadedMetrics = await getMetrics();
      setMetrics(loadedMetrics);
    } catch (error) {
      console.error("Dashboard metrics error:", error);
      setMetricsError("Could not load dashboard metrics.");
    } finally {
      setLoading(false);
    }

    setDraftsLoading(true);
    setDraftsError(null);
    try {
      const response = await adminFetch("/api/admin/posts?status=draft&limit=5", authToken);
      setDrafts((await response.json()) as Post[]);
    } catch (error) {
      console.error("Dashboard drafts error:", error);
      setDraftsError("Could not load draft queue.");
    } finally {
      setDraftsLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = getAdminSessionToken();
    if (!savedToken) {
      router.push("/admin/login");
      return;
    }
    setToken(savedToken);
    loadDashboard(savedToken);
  }, [router]);

  if (!token) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-400/25 via-sky-500/20 to-orange-400/25 text-lg font-black text-white shadow-lg shadow-cyan-500/10">
            LF
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Admin Dashboard</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Logixa Flow Operations
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              A focused command center for content, AI review, operating signals, and free-stack cost planning.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20" href="/admin/system">
            System Status
          </Link>
          <Link className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500" href="/">
            View Public Site
          </Link>
        </div>
      </header>

      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/60 p-2">
        {dashboardTabs.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`flex min-w-max items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-cyan-500/15 text-cyan-100 shadow-[inset_0_-2px_0_rgba(34,211,238,0.9)]"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {view === "overview" && (
        <div className="space-y-8">
          <section className="rounded-3xl border border-cyan-400/15 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Priority Workspace</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Important work only on the dashboard.</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                  Core controls stay here. Detailed tools live under their module pages so the admin area stays fast and readable on desktop and mobile.
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                <CheckCircle2 className="h-5 w-5" />
                System online
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {loading ? (
              <>
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
              </>
            ) : metricsError ? (
              <div className="sm:col-span-2 xl:col-span-4">
                <ErrorState
                  title="Metrics unavailable"
                  description={metricsError}
                  actionLabel="Retry"
                  actionOnClick={() => loadDashboard(token)}
                />
              </div>
            ) : (
              statCards.map((card) => (
                <article key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5 shadow-xl shadow-black/10">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                  <strong className="mt-3 block text-3xl font-black text-white">{card.value}</strong>
                  <p className="mt-2 text-sm text-slate-400">{card.detail}</p>
                </article>
              ))
            )}
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {commandModules.map((module) => {
              const Icon = module.icon;
              return (
                <Link
                  key={module.title}
                  href={module.href}
                  className="group rounded-2xl border border-slate-800 bg-slate-900/65 p-5 shadow-xl shadow-black/10 transition hover:-translate-y-0.5 hover:border-cyan-400/35 hover:bg-slate-900"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{module.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{module.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Draft Queue</p>
                  <h2 className="mt-2 text-xl font-bold text-white">Content waiting for action</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setView("drafts")}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400/40"
                >
                  Open
                </button>
              </div>
              <div className="mt-5 space-y-3">
                {draftsLoading ? (
                  <>
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                  </>
                ) : draftsError ? (
                  <ErrorState description={draftsError} actionLabel="Retry" actionOnClick={() => loadDashboard(token)} />
                ) : drafts.length === 0 ? (
                  <EmptyState title="No drafts waiting" description="New draft posts and AI review output will appear here." icon="-" />
                ) : (
                  drafts.map((draft) => (
                    <article key={draft.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-white">{draft.title}</p>
                          <p className="text-sm text-slate-500">{draft.category} / {draft.type}</p>
                        </div>
                        <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
                          Draft
                        </span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Readiness</p>
              <h2 className="mt-2 text-xl font-bold text-white">Beta operating checks</h2>
              <div className="mt-5 space-y-3">
                {readiness.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-300">{item.label}</span>
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-200">
                        {item.value}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {view === "create" && (
        <section className="rounded-3xl border border-cyan-400/15 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-7">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">CMS</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Create Insight</h2>
            <p className="mt-2 text-sm text-slate-400">Write or stage a public insight without leaving the admin workspace.</p>
          </div>
          <InsightForm token={token} />
        </section>
      )}

      {view === "drafts" && (
        <section className="rounded-3xl border border-cyan-400/15 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-7">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Editorial Queue</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Drafts</h2>
            </div>
            <Link href="/admin/drafts" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400/40">
              Full Draft Manager
            </Link>
          </div>
          {draftsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : draftsError ? (
            <ErrorState description={draftsError} actionLabel="Retry" actionOnClick={() => loadDashboard(token)} />
          ) : drafts.length === 0 ? (
            <EmptyState title="No drafts found" description="Create an insight or run an AI agent to populate the draft queue." icon="-" />
          ) : (
            <div className="grid gap-3">
              {drafts.map((draft) => (
                <article key={draft.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <h3 className="font-semibold text-white">{draft.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{draft.excerpt || "No excerpt yet."}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {view === "import" && (
        <section className="rounded-3xl border border-cyan-400/15 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-7">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Import Calendar</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Bulk Import</h2>
            <p className="mt-2 text-sm text-slate-400">Import CSV or spreadsheet rows as staged content.</p>
          </div>
          <ImportCalendar token={token} />
        </section>
      )}
    </div>
  );
}
