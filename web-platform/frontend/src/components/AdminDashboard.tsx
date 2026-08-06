"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import Skeleton from "./shadcn/Skeleton";
import EmptyState from "./EmptyState";
import ErrorState from "./ErrorState";
import { DashboardMetric, Post, adminFetch, getMetrics } from "./api";
import ImportCalendar from "./ImportCalendar";
import CostDashboard from "./CostDashboard";
import InsightForm from "./InsightForm";
import { WorkflowState } from "./WorkflowCards";
import { getAdminSessionToken } from "@/lib/adminSession";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  DollarSign,
  Bot,
  Brain,
  BarChart3,
  Server,
  Rss,
  TrendingUp,
  TrendingDown,
  Plus
} from "lucide-react";

type AIModel = "gemini" | "llama3" | "deepseek" | "groq";
type AdminView = "overview" | "create" | "drafts" | "import" | "costs";

const betaSampleDrafts: Post[] = [
  {
    id: -1,
    title: "AI Risk Radar: Supplier Delay Watch",
    slug: "beta-supplier-delay-watch",
    type: "analysis",
    category: "Supply Chain",
    excerpt: "Sample staged draft for previewing the publishing queue.",
    content_html: "<p>Sample staged draft.</p>",
    image_url: null,
    source_url: null,
    is_published: false,
    status: "draft",
    published_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: -2,
    title: "Logistics Pulse: Port Congestion Brief",
    slug: "beta-port-congestion-brief",
    type: "analysis",
    category: "Logistics",
    excerpt: "Sample logistics calendar item ready for editorial review.",
    content_html: "<p>Sample staged draft.</p>",
    image_url: null,
    source_url: null,
    is_published: false,
    status: "draft",
    published_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: -3,
    title: "Operations Excellence: Weekly Flow Note",
    slug: "beta-weekly-flow-note",
    type: "analysis",
    category: "Operations Excellence",
    excerpt: "Sample operations excellence draft for dashboard layout testing.",
    content_html: "<p>Sample staged draft.</p>",
    image_url: null,
    source_url: null,
    is_published: false,
    status: "draft",
    published_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const workflowSteps = [
  { id: 1, title: "Collect global SCM signals" },
  { id: 2, title: "Draft Myanmar-ready insight" },
  { id: 3, title: "Review and approve" },
  { id: 4, title: "Publish to website" },
];

const workflowStates: WorkflowState[] = [
  {
    id: "draft",
    label: "Draft",
    icon: "??",
    description: "Content creation in progress",
    count: 12,
    color: "orange",
  },
  {
    id: "pending-review",
    label: "Pending Review",
    icon: "???",
    description: "Awaiting editorial approval",
    count: 5,
    color: "orange",
  },
  {
    id: "approved",
    label: "Approved",
    icon: "?",
    description: "Cleared for publication",
    count: 3,
    color: "green",
  },
  {
    id: "published",
    label: "Published",
    icon: "??",
    description: "Live on the website",
    count: 47,
    color: "blue",
  },
  {
    id: "needs-edit",
    label: "Needs Edit",
    icon: "??",
    description: "Requires revisions",
    count: 2,
    color: "slate",
  },
];

const workflowColorTokens = {
  orange: "#fb923c",
  green: "#22c55e",
  blue: "#38bdf8",
  slate: "#94a3b8",
} as const;

export default function AdminDashboard() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Post[]>(betaSampleDrafts);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<AIModel>("gemini");
  const [view, setView] = useState<AdminView>("overview");
  const [homepageSections, setHomepageSections] = useState({
    flowIndex: true,
    premiumMap: true,
    capabilities: true,
    latestInsights: true,
  });
  const [heroImageUrl, setHeroImageUrl] = useState(
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663711174711/mC8euUmwVApAKCWxV24ccj/supply-chain-visualization-cGqhaCjJojUE9wKn8tsNpT.webp",
  );
  const [featuredArticles, setFeaturedArticles] = useState(["From SOPs to Control Towers", "Warehouse Flow Excellence"]);
  const [flowIndexDraft, setFlowIndexDraft] = useState({
    index: "97.4",
    disruptionRisk: "Low",
    demandShift: "+12%",
    portCongestion: "2.1d",
    inventoryCover: "38d",
  });

  useEffect(() => {
    const saved = getAdminSessionToken();
    if (!saved) {
      router.push("/admin/login");
      return;
    }
    setToken(saved);
    setMetricsLoading(true);
    setMetricsError(null);
    getMetrics()
      .then(setMetrics)
      .catch(() => {
        setMetricsError("Failed to load dashboard metrics.");
        toast.error("Metrics could not be loaded.");
      })
      .finally(() => setMetricsLoading(false));
    adminFetch("/api/settings/ai", saved)
      .then((response) => response.json())
      .then((data) => setAiModel(data.selected_model || "gemini"))
      .catch(() => setAiModel("gemini"));
  }, [router]);

  useEffect(() => {
    if (token && view === "drafts") {
      setDraftsLoading(true);
      setDraftsError(null);
      adminFetch("/api/admin/posts?status=draft", token)
        .then((response) => response.json())
        .then((records: Post[]) => {
          setDrafts(records.length ? records : betaSampleDrafts);
          setDraftsLoading(false);
        })
        .catch(() => {
          setDraftsError("Failed to load drafts. Please try again.");
          setDraftsLoading(false);
          toast.error("Drafts could not be loaded.");
        });
    }
  }, [token, view]);

  async function saveAIModel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await adminFetch("/api/settings/ai", token, {
        method: "PATCH",
        body: JSON.stringify({ selected_model: aiModel }),
      });
      toast.success("AI writer model updated.");
    } catch {
      toast.error("Failed to update AI model. Please try again.");
    }
  }

  function toggleHomepageSection(key: keyof typeof homepageSections) {
    setHomepageSections((current) => ({ ...current, [key]: !current[key] }));
  }

  function updateFlowIndexMetric(key: keyof typeof flowIndexDraft, value: string) {
    setFlowIndexDraft((current) => ({ ...current, [key]: value }));
  }

  if (!token) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 w-3/4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-8 w-1/3" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  const dashboardSignals = metrics.length
    ? metrics.map((metric, index) => ({
        label: metric.title,
        value: metric.value,
        tone: index % 2 === 0 ? "cyan" : "orange",
      }))
    : [];

  const metricsAreZero =
    metrics.length > 0 &&
    metrics.every((metric) => {
      const numeric = parseFloat(String(metric.value).replace(/[^0-9.-]/g, ""));
      return Number.isNaN(numeric) || numeric === 0;
    });

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "create", label: "Create", icon: FileText },
    { id: "insight", label: "Insight", icon: FileText },
    { id: "drafts", label: "Drafts", icon: FileText },
    { id: "import", label: "Import", icon: Calendar },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "costs", label: "Costs", icon: DollarSign },
    { id: "agent", label: "AI Agent", icon: Bot },
    { id: "brain", label: "Brain Queue", icon: Brain },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "feeds", label: "Feeds", icon: Rss },
    { id: "system", label: "System", icon: Server },
  ];

  const quickActions = [
    { id: "create", label: "Create Insight", icon: FileText },
    { id: "drafts", label: "View Drafts", icon: FileText },
    { id: "import", label: "Import Calendar", icon: Calendar },
    { id: "excel", label: "Excel Import", icon: FileText },
  ];

  return (
    <div className="space-y-8">
      {/* Header Area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4 sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-orange-400">
            <span className="text-2xl font-bold text-white">LF</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#38bdf8] uppercase tracking-widest">Admin Dashboard</p>
            <h1 className="text-2xl font-bold text-white">Logixa Flow Operations</h1>
            <p className="text-sm text-[#94a3b8] max-w-xl">
              Metrics, CMS content, photo uploads, and AI writer model control.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav
        className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-800/70 bg-slate-950/50 p-1 [scrollbar-width:none]"
        aria-label="Admin actions"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              className={`
                flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-[#0f172a] text-[#38bdf8] shadow-[0_0_0_1px_rgba(56,189,248,0.25)]'
                  : 'text-[#64748b] hover:bg-[#1e293b] hover:text-[#e2e8f0]'
                }
              `}
              onClick={() => {
                if (item.id === "agent") router.push("/agent");
                else if (item.id === "brain") router.push("/admin/brain");
                else if (item.id === "analytics") router.push("/admin/analytics");
                else if (item.id === "feeds") router.push("/admin/feeds");
                else if (item.id === "system") router.push("/admin/system");
                else setView(item.id as AdminView);
              }}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {view === "overview" ? (
        <div className="space-y-8">
          {/* Premium Workspace */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold text-[#38bdf8] uppercase tracking-widest mb-2">Premium Workspace</p>
            <h2 className="text-xl font-bold text-white mb-3">One brand system for public insights and internal AI operations.</h2>
            <p className="text-sm text-[#94a3b8] mb-6 max-w-3xl">
              The public site should stay focused on articles and brand trust. This workspace belongs here because
              it explains the internal workflow: planning, SOP intelligence, approval gates, and operating readiness.
            </p>

            {/* Workflow Stepper */}
            <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-4">
              {workflowSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    index < 2
                      ? "border-cyan-400/35 bg-cyan-500/10"
                      : "border-slate-700/60 bg-slate-900/40"
                  }`}
                >
                    <div className={`
                      flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold
                      ${index < 2 ? 'bg-[#38bdf8] text-white shadow-lg shadow-[#38bdf8]/20' : 'bg-[#475569] text-[#94a3b8]'}
                    `}>
                      {step.id}
                    </div>
                    <span className={`text-sm font-medium ${index < 2 ? 'text-[#38bdf8]' : 'text-[#475569]'}`}>
                      {step.title}
                    </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="px-3 py-1 bg-[rgba(59,130,246,0.15)] text-[#60a5fa] border border-[rgba(59,130,246,0.3)] rounded-lg text-xs">
                  Logixa Flow OS / Admin Only
                </div>
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-[#2563eb] transition-colors"
                  onClick={() => setView("create")}
                >
                  <Plus className="w-4 h-4" />
                  Create Insight
                </button>
              </div>
            </div>
          </div>

          {/* Command Modules */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {[
              {
                label: "Command Center",
                title: "Daily SCM operating view",
                body: "Track disruption signals, draft activity, publishing readiness, and priority actions from one executive surface.",
              },
              {
                label: "SOP Intelligence",
                title: "Document-ready workflow",
                body: "A controlled path for import, warehouse, customs, and logistics SOP knowledge before AI-assisted Q&A is enabled.",
              },
              {
                label: "Security Center",
                title: "Approval-first publishing",
                body: "Drafts stay private until reviewed. The system is structured for backups, admin access, and later production hardening.",
              },
            ].map((module) => (
              <div key={module.label} className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5">
                <p className="text-xs font-semibold text-[#38bdf8] uppercase tracking-widest mb-1">{module.label}</p>
                <h3 className="text-base font-bold text-white mb-2">{module.title}</h3>
                <p className="text-sm text-[#94a3b8] leading-relaxed">{module.body}</p>
              </div>
            ))}
          </div>

          {/* AI Control Tower - Stat Cards */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6">
            <p className="text-xs font-semibold text-[#38bdf8] uppercase tracking-widest mb-2">AI CONTROL TOWER</p>
            <h2 className="text-xl font-bold text-white mb-2">Public Signal Cards</h2>
            <p className="text-sm text-[#94a3b8] mb-6">
              Read-only automation indicators. Background AI agents collect signals, remove duplicates, and estimate
              publishing pipeline volume from staged content.
            </p>

            {metricsLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : metricsError ? (
              <ErrorState
                title="Failed to load metrics"
                description={metricsError}
                actionLabel="Retry"
                actionOnClick={() => {
                  setMetricsError(null);
                  setMetricsLoading(true);
                  getMetrics()
                    .then(setMetrics)
                    .catch(() => {
                      setMetricsError("Failed to load dashboard metrics.");
                      toast.error("Metrics could not be loaded.");
                    })
                    .finally(() => setMetricsLoading(false));
                }}
              />
            ) : metricsAreZero || dashboardSignals.length === 0 ? (
              <EmptyState
                icon="??"
                title="No metrics yet"
                description="Run the agent, publish insights, or import sources to populate your control tower signals."
                actionLabel="Open AI Agent"
                actionHref="/agent"
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Supply Chain Disruption Risk", value: "Low", status: "green", trend: null },
                  { label: "Market Demand Shifts", value: "+12%", status: "green", trend: "up" },
                  { label: "Logistics & Port Congestion", value: "2.1d", status: "amber", trend: null },
                  { label: "Inventory Cover Projections", value: "38d", status: "green", trend: null },
                ].map((stat) => (
                  <div key={stat.label} className="bg-[#1e293b] border-l-4 border-[#38bdf8] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
                      {stat.trend === "up" && <TrendingUp className="w-4 h-4 text-[#22c55e]" />}
                      {stat.trend === "down" && <TrendingDown className="w-4 h-4 text-[#ef4444]" />}
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-xs uppercase text-[#94a3b8]">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Publishing Pipeline - Cards */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6">
            <p className="text-xs font-semibold text-[#38bdf8] uppercase tracking-widest mb-2">Publishing Pipeline</p>
            <h2 className="text-xl font-bold text-white mb-2">Content Workflow States</h2>
            <p className="text-sm text-[#94a3b8] mb-6">
              Track content through each stage: from drafting through editorial review to publication. Click any state card for more details.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {workflowStates.map((state) => {
                const color = workflowColorTokens[state.color as keyof typeof workflowColorTokens] ?? "#38bdf8";

                return (
                  <button
                    key={state.id}
                    onClick={() => {
                      toast.info(`Viewing ${state.id} items...`);
                      setView("drafts");
                    }}
                    className="relative rounded-lg border border-slate-700/70 border-t-4 bg-[#1e293b]/70 p-4 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                    style={{ borderTopColor: color }}
                  >
                    <div
                      className="mb-2 flex h-8 w-8 items-center justify-center rounded-full"
                      style={{ backgroundColor: color }}
                    >
                      <span className="text-sm">{state.icon}</span>
                    </div>
                    <h3 className="mb-1 text-sm font-bold text-white">{state.label}</h3>
                    <p className="mb-3 text-xs text-[#94a3b8]">{state.description}</p>
                    <span
                      className="inline-block rounded-full px-3 py-1 text-xs font-bold"
                      style={{ backgroundColor: `${color}24`, color }}
                    >
                      {state.count} items
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6">
            <p className="text-xs font-semibold text-[#38bdf8] uppercase tracking-widest mb-2">Quick Actions</p>
            <h2 className="text-xl font-bold text-white mb-6">Workflow Shortcuts</h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => {
                      if (action.id === "create") setView("create");
                      else if (action.id === "drafts") setView("drafts");
                      else if (action.id === "import") setView("import");
                    }}
                    className="flex flex-col items-center gap-2 p-4 bg-[#1e293b] border border-[#334155] rounded-xl hover:bg-[#334155] hover:border-[#38bdf8] hover:text-[#38bdf8] transition-all"
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Homepage Controls */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6">
            <p className="text-xs font-semibold text-[#38bdf8] uppercase tracking-widest mb-2">HOMEPAGE CONTROLS</p>
            <h2 className="text-xl font-bold text-white mb-2">Public Homepage Preview Controls</h2>
            <p className="text-sm text-[#94a3b8] mb-6">
              Beta controls for testing what should become CMS-managed later. These stay inside admin and do not
              change the backend, database, or public auth flow.
            </p>

            <div className="space-y-6">
              {/* Toggle Switches */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {[
                  ["flowIndex", "Flow Index panel"],
                  ["premiumMap", "Premium map visual"],
                  ["capabilities", "Capabilities section"],
                  ["latestInsights", "Latest insights ticker"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => toggleHomepageSection(key as keyof typeof homepageSections)}
                    className="flex items-center justify-between p-4 bg-[#1e293b] border border-[#334155] rounded-lg hover:bg-[#334155] transition-colors"
                  >
                    <span className="text-sm">{label}</span>
                    <div className={`
                      w-10 h-5 rounded-full relative transition-colors
                      ${homepageSections[key as keyof typeof homepageSections] ? 'bg-[#22c55e]' : 'bg-[#475569]'}
                    `}>
                      <div className={`
                        w-4 h-4 rounded-full absolute top-0.5 transition-transform
                        ${homepageSections[key as keyof typeof homepageSections] ? 'translate-x-5 bg-white' : 'translate-x-0.5 bg-white'}
                      `} />
                    </div>
                  </button>
                ))}
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <label className="block text-sm text-[#94a3b8] mb-2">Hero Visual Image URL</label>
                  <input
                    value={heroImageUrl}
                    onChange={(event) => setHeroImageUrl(event.target.value)}
                    placeholder="Paste public image URL"
                    className="w-full px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-white focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/20 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="upload-visual" className="block text-sm text-[#94a3b8] mb-2">Upload / Change Visual</label>
                  <input
                    id="upload-visual"
                    type="file"
                    accept="image/*"
                    onChange={() => toast.info("Image upload is staged as UI only.")}
                    className="w-full px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-white focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="featured-articles" className="block text-sm text-[#94a3b8] mb-2">Featured Articles</label>
                <select
                  id="featured-articles"
                  multiple
                  value={featuredArticles}
                  onChange={(event) =>
                    setFeaturedArticles(Array.from(event.target.selectedOptions, (option) => option.value))
                  }
                  className="w-full px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-white focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/20 transition-all"
                >
                  <option value="From SOPs to Control Towers">From SOPs to Control Towers</option>
                  <option value="Warehouse Flow Excellence">Warehouse Flow Excellence</option>
                  <option value="Strategic Sourcing in the AI Era">Strategic Sourcing in the AI Era</option>
                  <option value="Port Congestion Watch">Port Congestion Watch</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  ["index", "Flow Index"],
                  ["disruptionRisk", "Disruption Risk"],
                  ["demandShift", "Demand Shift"],
                  ["portCongestion", "Port Congestion"],
                  ["inventoryCover", "Inventory Cover"],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label htmlFor={`flow-index-${key}`} className="block text-xs text-[#94a3b8] mb-1">{label}</label>
                    <input
                      id={`flow-index-${key}`}
                      value={flowIndexDraft[key as keyof typeof flowIndexDraft]}
                      onChange={(event) => updateFlowIndexMetric(key as keyof typeof flowIndexDraft, event.target.value)}
                      className="w-full px-3 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-white text-sm focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/20 transition-all"
                    />
                  </div>
                ))}
              </div>

              <button
                className="px-6 py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-[#2563eb] transition-colors"
                onClick={() => toast.info("Homepage controls staged locally.")}
              >
                Stage Homepage Controls
              </button>
            </div>
          </div>

          {/* Writer Agent */}
          <form onSubmit={saveAIModel} className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6">
            <p className="text-xs font-semibold text-[#38bdf8] uppercase tracking-widest mb-2">WRITER AGENT</p>
            <h2 className="text-xl font-bold text-white mb-6">AI Model Switcher</h2>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <label htmlFor="active-model" className="block text-sm text-[#94a3b8] mb-2">Active Model</label>
                <select
                  id="active-model"
                  value={aiModel}
                  onChange={(event) => setAiModel(event.target.value as AIModel)}
                className="w-full px-4 py-2.5 bg-[#1e293b] border border-[#334155] rounded-lg text-white focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/20 transition-all"
                >
                  <option value="gemini">Gemini</option>
                  <option value="llama3">OpenRouter Llama 3</option>
                  <option value="deepseek">OpenRouter DeepSeek R1</option>
                  <option value="groq">Groq Llama</option>
                </select>
              </div>
              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-lg bg-[#3b82f6] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2563eb]"
              >
                <Plus className="w-4 h-4" />
                Save AI Model
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {view === "create" ? <InsightForm token={token} /> : null}
      {view === "import" ? <ImportCalendar token={token} /> : null}
      {view === "costs" ? <CostDashboard token={token} /> : null}
      {view === "drafts" ? (
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6">
          <p className="text-xs font-semibold text-[#38bdf8] uppercase tracking-widest mb-2">Content Staging</p>
          <h2 className="text-xl font-bold text-white mb-6">Drafts</h2>
          {draftsError ? (
            <ErrorState
              title="Failed to load drafts"
              description={draftsError}
              actionLabel="Retry"
              actionOnClick={() => {
                setDraftsError(null);
                setDraftsLoading(true);
                adminFetch("/api/admin/posts?status=draft", token)
                  .then((response) => response.json())
                  .then((records: Post[]) => {
                    setDrafts(records.length ? records : betaSampleDrafts);
                    setDraftsLoading(false);
                  })
                  .catch(() => {
                    setDraftsError("Failed to load drafts. Please try again.");
                    setDraftsLoading(false);
                    toast.error("Drafts could not be loaded.");
                  });
              }}
            />
          ) : draftsLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : drafts.length ? (
            <div className="space-y-4">
              {drafts.map((draft) => (
                <article className="flex flex-col gap-3 rounded-lg border border-[#334155] bg-[#1e293b] p-4 sm:flex-row sm:items-center sm:justify-between" key={draft.id}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-[#f59e0b]/20 text-[#f59e0b] rounded text-xs font-medium">Draft</span>
                      <strong className="text-white">{draft.title}</strong>
                    </div>
                    <p className="text-sm text-[#94a3b8]">{draft.category} � {draft.excerpt || "No excerpt yet."}</p>
                  </div>
                  <button
                    className="px-4 py-2 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-[#2563eb] transition-colors"
                    onClick={() => toast.info("Preview publish action only.")}
                  >
                    Publish
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="??"
              title="No drafts yet"
              description="Create your first insight or run the AI agent to generate draft content."
              actionLabel="Create Insight"
              actionOnClick={() => setView("create")}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
