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
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import ErrorState from "./ErrorState";
import { AdminActivityEntry, DashboardMetric, Post, SystemStatus, adminFetch, getMetrics } from "./api";
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
    featured: false,
  },
  {
    title: "AI Brain",
    description: "Review private AI output before anything becomes public.",
    href: "/admin/brain",
    icon: Brain,
    accent: "violet",
    featured: false,
  },
  {
    title: "Agent Control",
    description: "Run agents, check profiles, and inspect automation traces.",
    href: "/admin/agents",
    icon: Bot,
    accent: "emerald",
    featured: false,
  },
  {
    title: "Finance & Costs",
    description: "Track free-stack status, API spend, and monthly planning.",
    href: "/admin/costs",
    icon: DollarSign,
    accent: "amber",
    featured: true,
  },
  {
    title: "Logistics Estimator",
    description: "Run vehicle-fit and capacity calculations before dispatch decisions.",
    href: "/admin/estimator",
    icon: PackageCheck,
    accent: "sky",
    featured: true,
  },
  {
    title: "System Health",
    description: "Environment variables, provider readiness, and backend status.",
    href: "/admin/system",
    icon: Server,
    accent: "slate",
    featured: false,
  },
];

const readiness = [
  { label: "Public site", value: "Stable", detail: "Keep user pages clean and fast." },
  { label: "Backend API", value: "Connected", detail: "Render service is the runtime source." },
  { label: "User AI", value: "Public", detail: "Customer-facing assistant path enabled." },
  { label: "Admin AI", value: "Internal", detail: "Ops automation and agent orchestration split." },
  { label: "Costs", value: "Planning", detail: "Track free tiers before paid scale." },
  { label: "Estimator", value: "Ready", detail: "Vehicle fit and capacity checks on standby." },
];

const aiLayerStatus = [
  { label: "User AI", value: "Ready", detail: "Public assistant lane" },
  { label: "Admin AI", value: "Ready", detail: "Internal workflow automation" },
  { label: "Cost guardrail", value: "Active", detail: "Free-tier tracking enabled" },
  { label: "Estimator", value: "Live", detail: "Capacity checks ready" },
];

const liveAlerts = [
  {
    title: "Public assistant",
    detail: "Customer-facing AI remains isolated from internal workflows.",
    tone: "cyan",
  },
  {
    title: "Admin automation",
    detail: "Ops workflows are routed with internal-only provider access.",
    tone: "violet",
  },
  {
    title: "Operational guardrails",
    detail: "Cost and estimator checks remain visible on the command center.",
    tone: "amber",
  },
];

const recentActivity = [
  {
    time: "2 min ago",
    title: "AI split verified",
    detail: "Public user assistant stayed separate from admin automation credentials.",
    tone: "cyan",
  },
  {
    time: "11 min ago",
    title: "Cost guardrail refreshed",
    detail: "Free-tier usage and spend thresholds stayed in view for the operations team.",
    tone: "amber",
  },
  {
    time: "24 min ago",
    title: "Estimator processed",
    detail: "Capacity-check workflow remained available for route planning and dispatch tasks.",
    tone: "violet",
  },
] as const;

const recentActivityFallback = [...recentActivity];

function metricValue(metrics: DashboardMetric[], key: string, fallback: string) {
  return metrics.find((metric) => metric.key === key)?.value || fallback;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [view, setView] = useState<AdminView>("overview");
  const [token, setToken] = useState("");
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [finance, setFinance] = useState<Record<string, unknown> | null>(null);
  const [usageTrend, setUsageTrend] = useState<Record<string, unknown>[]>([]);
  const [usageByKey, setUsageByKey] = useState<Record<string, unknown>[]>([]);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [draftsError, setDraftsError] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [activityFeed, setActivityFeed] = useState<AdminActivityEntry[]>([]);
  const [systemStatusError, setSystemStatusError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);

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
    setSystemStatusError(null);
    setActivityError(null);
    try {
      const loadedMetrics = await getMetrics();
      setMetrics(loadedMetrics);
    } catch (error) {
      console.error("Dashboard metrics error:", error);
      setMetricsError("Could not load dashboard metrics.");
    } finally {
      setLoading(false);
    }

    // Fetch finance summary
    try {
      setFinanceError(null);
      const finResp = await adminFetch("/api/admin/finance/summary", authToken);
      const finJson = await finResp.json();
      setFinance(finJson);
    } catch (err) {
      console.error("Finance summary error:", err);
      setFinanceError("Could not load finance summary.");
      setFinance(null);
    }

    // Fetch usage trend
    try {
      setUsageError(null);
      const usageResp = await adminFetch("/api/admin/usage/trend", authToken);
      const usageJson = await usageResp.json();
      setUsageTrend(usageJson.daily || []);
    } catch (err) {
      console.error("Usage trend error:", err);
      setUsageError("Could not load usage trend.");
      setUsageTrend([]);
    }

    // Fetch usage by key (donut)
    try {
      const resp = await adminFetch("/api/admin/usage", authToken).catch(() => null);
      if (resp) {
        const j = await resp.json();
        setUsageByKey(j.usage_by_key || []);
      }
    } catch (err) {
      console.error("Usage by key error:", err);
      setUsageByKey([]);
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

    try {
      const statusResponse = await adminFetch("/api/admin/system/status", authToken);
      const statusData = (await statusResponse.json()) as SystemStatus;
      setSystemStatus(statusData);
    } catch (error) {
      console.error("System status error:", error);
      setSystemStatusError("Could not load system status.");
    }

    try {
      const activityResponse = await adminFetch("/api/admin/activity", authToken);
      const activityData = (await activityResponse.json()) as AdminActivityEntry[];
      setActivityFeed(activityData.length > 0 ? activityData : recentActivityFallback);
    } catch (error) {
      console.error("Admin activity error:", error);
      setActivityError("Could not load activity feed.");
      setActivityFeed(recentActivityFallback);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const savedToken = await getAdminSessionToken();
      if (cancelled) return;
      if (!savedToken) {
        router.push("/admin/login");
        return;
      }
      setToken(savedToken);
      await loadDashboard(savedToken);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const readinessCards = useMemo(() => {
    if (!systemStatus) return readiness;
    const userProvider = systemStatus.user_active_provider || systemStatus.active_provider || "Gemini";
    const adminProvider = systemStatus.admin_active_provider || systemStatus.active_provider || "Mistral";
    return [
      { label: "Public site", value: "Stable", detail: "Keep user pages clean and fast." },
      { label: "Backend API", value: "Connected", detail: "Render service is the runtime source." },
      { label: "User AI", value: userProvider, detail: `${userProvider} is serving the public assistant lane.` },
      { label: "Admin AI", value: adminProvider, detail: `${adminProvider} is serving internal automation and workflows.` },
      { label: "Costs", value: "Planning", detail: "Track free tiers before paid scale." },
      { label: "Estimator", value: "Ready", detail: "Vehicle fit and capacity checks on standby." },
    ];
  }, [systemStatus]);

  const aiLayerCards = useMemo(() => {
    if (!systemStatus) return aiLayerStatus;
    const userProvider = systemStatus.user_active_provider || systemStatus.active_provider || "Gemini";
    const adminProvider = systemStatus.admin_active_provider || systemStatus.active_provider || "Mistral";
    return [
      { label: "User AI", value: userProvider, detail: "Public assistant lane" },
      { label: "Admin AI", value: adminProvider, detail: "Internal workflow automation" },
      { label: "Cost guardrail", value: "Active", detail: "Free-tier tracking enabled" },
      { label: "Estimator", value: systemStatus.scheduler_enabled ? "Live" : "Standby", detail: "Capacity checks ready" },
    ];
  }, [systemStatus]);

  const liveAlertCards = useMemo(() => {
    if (!systemStatus) return liveAlerts;
    return [
      {
        title: "Public assistant",
        detail: `User routing is active on ${systemStatus.user_active_provider || "Gemini"}.`,
        tone: "cyan",
      },
      {
        title: "Admin automation",
        detail: `Admin routing is active on ${systemStatus.admin_active_provider || "Mistral"}.`,
        tone: "violet",
      },
      {
        title: "Operational guardrails",
        detail: systemStatus.scheduler_enabled ? "Scheduler is enabled and operational." : "Scheduler is currently disabled.",
        tone: "amber",
      },
    ];
  }, [systemStatus]);

  const recentActivityCards = useMemo(() => {
    return activityFeed.length > 0 ? activityFeed : recentActivityFallback;
  }, [activityFeed]);

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
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#1E293B] bg-gradient-to-br from-[#22D3EE] via-[#F59E0B] to-[#22D3EE] text-lg font-black text-white shadow-lg shadow-[#22D3EE]/10">
            LF
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#22D3EE]">Admin Dashboard</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Logixa Flow Operations
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              A focused command center for content, AI review, operating signals, and free-stack cost planning.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            User AI
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-100">
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            Admin AI
          </span>
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
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#22D3EE]">Priority Workspace</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Important work only on the dashboard.</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#94A3B8]">
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
              // Use Finance KPIs if available
              (finance ? [
                { label: "Revenue", value: finance.revenue != null ? "$" + Number(finance.revenue).toLocaleString() : "-", detail: "Revenue (actual or estimated)" },
                                { label: "Expenses", value: finance.expenses != null ? "$" + Number(finance.expenses).toLocaleString() : "-", detail: "Total expenses (actual + budgets)" },
                                { label: "Profit", value: finance.profit != null ? "$" + Number(finance.profit).toLocaleString() : "-", detail: "Profit = Revenue - Expenses" },
                { label: "Projects", value: finance.projects_count != null ? String(finance.projects_count) : "-", detail: "Active tracked projects" },
              ] : statCards).map((card) => (
                <article key={card.label} className="rounded-2xl border border-[#1E293B] bg-[#101728] p-5 shadow-xl shadow-[0_10px_30px_rgba(2,15,30,0.6)] hover:border-[#22D3EE]/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.12)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">{card.label}</p>
                  <strong className="mt-3 block text-3xl font-black text-[#E2E8F0]">{card.value}</strong>
                                    <p className="mt-2 text-sm text-[#94A3B8]">{card.detail}</p>
                </article>
              ))
            )}
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {aiLayerCards.map((item) => (
              <article key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 shadow-xl shadow-black/10">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200">
                    {item.value}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-400">{item.detail}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#22D3EE]">API Usage</p>
                  <h2 className="mt-2 text-xl font-bold text-white">Requests over time</h2>
                </div>
              </div>
              <div style={{ width: '100%', height: 240 }} className="mt-4">
                {usageError ? (
                  <div className="text-sm text-red-300">{usageError}</div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={usageTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid stroke="#1E293B" />
                      <XAxis dataKey="date" tick={{ fill: '#94A3B8' }} />
                      <YAxis tick={{ fill: '#94A3B8' }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="tokens" stroke="#22D3EE" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="cost" stroke="#F59E0B" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Donut chart: API key usage share */}
              <div className="mt-4 rounded-2xl bg-[#101728] p-3 border border-[#1E293B]">
                              <h3 className="text-xs font-semibold text-[#94A3B8]">API Key Usage Share</h3>
                <div style={{ width: 180, height: 180 }} className="mx-auto mt-3">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie data={usageByKey} dataKey="tokens" nameKey="api_key_name" cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3}>
                        {usageByKey.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={["#22D3EE","#F59E0B","#10B981"][idx % 3]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
 
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#22D3EE]">Revenue vs Expenses</p>
                  <h2 className="mt-2 text-xl font-bold text-white">Latest summary</h2>
                </div>
              </div>
              <div style={{ width: '100%', height: 240 }} className="mt-4">
                {financeError ? (
                  <div className="text-sm text-red-300">{financeError}</div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={[{ name: 'Totals', revenue: finance?.revenue || 0, expenses: finance?.expenses || 0 }]}>
                      <defs>
                        <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05}/>
                        </linearGradient>
                        <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1f2937" />
                      <XAxis dataKey="name" tick={{ fill: '#94a3b8' }} />
                      <YAxis tick={{ fill: '#94a3b8' }} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" stroke="#06b6d4" fillOpacity={1} fill="url(#gradRev)" />
                      <Area type="monotone" dataKey="expenses" stroke="#f59e0b" fillOpacity={1} fill="url(#gradExp)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </section>
          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Live ops</p>
                  <h2 className="mt-2 text-xl font-bold text-white">Operations pulse</h2>
                </div>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">
                  Stable
                </span>
              </div>
              {systemStatusError && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-200">
                  {systemStatusError}
                </div>
              )}
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {liveAlertCards.map((alert) => (
                  <article
                    key={alert.title}
                    className={`rounded-2xl border p-4 ${
                      alert.tone === "cyan"
                        ? "border-cyan-400/20 bg-cyan-500/5"
                        : alert.tone === "violet"
                          ? "border-violet-400/20 bg-violet-500/5"
                          : "border-amber-400/20 bg-amber-500/5"
                    }`}
                  >
                    <p className="text-sm font-semibold text-white">{alert.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{alert.detail}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Quick focus</p>
              <h2 className="mt-2 text-xl font-bold text-white">Priority queue</h2>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-3">
                  <p className="text-sm font-semibold text-white">Review AI policy split</p>
                  <p className="mt-1 text-sm text-slate-400">Verify public and admin AI lanes remain correctly isolated.</p>
                </div>
                <div className="rounded-2xl border border-violet-400/20 bg-violet-500/5 p-3">
                  <p className="text-sm font-semibold text-white">Monitor cost drift</p>
                  <p className="mt-1 text-sm text-slate-400">Keep free-tier usage visible before it moves to paid scale.</p>
                </div>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-3">
                  <p className="text-sm font-semibold text-white">Estimator readiness</p>
                  <p className="mt-1 text-sm text-slate-400">Vehicle-fit checks should stay available to ops and dispatch teams.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Recent activity</p>
                <h2 className="mt-2 text-xl font-bold text-white">System timeline</h2>
              </div>
              <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
                Live feed
              </span>
            </div>
            {activityError && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-200">
                {activityError}
              </div>
            )}
            <div className="mt-5 space-y-3">
              {recentActivityCards.map((entry) => (
                <div key={entry.title} className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div
                    className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      entry.tone === "cyan"
                                              ? "bg-[#22D3EE]"
                        : entry.tone === "amber"
                                                ? "bg-[#F59E0B]"
                          : "bg-violet-400"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-semibold text-white">{entry.title}</p>
                      <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{entry.time}</span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{entry.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {commandModules.map((module) => {
              const Icon = module.icon;
              return (
                <Link
                  key={module.title}
                  href={module.href}
                  className={`group rounded-2xl border p-5 shadow-xl shadow-black/10 transition duration-200 hover:-translate-y-0.5 hover:border-[#22D3EE]/40 hover:bg-[#101728] ${
                    module.featured ? "border-[#1E293B] bg-gradient-to-br from-[#22D3EE]/10 via-[#101728] to-[#0A0F1E]" : "border-[#1E293B] bg-[#101728]"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-[#22D3EE] ${
                        module.featured
                                                ? "border-[#22D3EE]/30 bg-[#22D3EE]/8"
                                                : "border-[#22D3EE]/20 bg-[#22D3EE]/8"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-lg font-bold text-white">{module.title}</h3>
                        {module.featured && (
                          <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">
                            Core
                          </span>
                        )}
                      </div>
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
                {readinessCards.map((item) => (
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
