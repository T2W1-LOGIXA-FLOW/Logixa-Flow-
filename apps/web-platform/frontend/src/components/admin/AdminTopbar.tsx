"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu } from "lucide-react";
import AdminStatusBadge from "./AdminStatusBadge";
import { ModelSelectorDropdown } from "./ModelSelectorDropdown";
import styles from "@/app/admin/admin-theme.module.css";

const routeLabels: Record<string, string> = {
  admin: "Overview",
  agents: "Agent Runs",
  "agent-chat": "Agent Chat",
  analytics: "Analytics",
  articles: "Articles",
  brain: "Brain Review",
  chat: "Conversations",
  content: "Content",
  controllers: "Controllers",
  costs: "AI Costs",
  deployments: "Deployments",
  drafts: "Drafts",
  "email-templates": "Email Templates",
  estimator: "Estimator",
  feeds: "Feeds",
  finance: "Finance",
  import: "Import",
  insights: "Insights",
  memory: "Memory",
  payments: "Payments",
  rag: "RAG Index",
  settings: "Settings",
  submissions: "Submissions",
  system: "System Health",
  usage: "Usage",
  workflow: "Workflows",
};

export default function AdminTopbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const currentSegment = segments[segments.length - 1] || "admin";
  const pageLabel = routeLabels[currentSegment] || currentSegment.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <header className={`${styles.topbar} sticky top-0 z-30 border-b backdrop-blur-xl`}>
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className={`${styles.menuButton} rounded-lg border border-slate-700/80 bg-slate-900/80 p-2 text-slate-300 hover:text-white lg:hidden`}
            aria-label="Open admin navigation"
            aria-controls="admin-navigation"
            aria-expanded="false"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-xs">
            <Link href="/admin" className="hidden font-semibold uppercase tracking-[0.16em] text-slate-500 hover:text-cyan-200 sm:inline">Operations</Link>
            <ChevronRight className="hidden h-3.5 w-3.5 text-slate-600 sm:block" aria-hidden="true" />
            <span className="truncate font-semibold text-slate-200" aria-current="page">{pageLabel}</span>
          </nav>
        </div>
        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="hidden sm:block"><ModelSelectorDropdown /></div>
          <AdminStatusBadge label="Admin" tone="cyan" />
        </div>
      </div>
    </header>
  );
}
