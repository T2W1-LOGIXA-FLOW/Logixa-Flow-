"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Brain,
  Calculator,
  Database,
  DollarSign,
  FileText,
  Gauge,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Package,
  Settings,
  Shield,
  Upload,
  Workflow,
  X,
  Bot,
  Server,
} from "lucide-react";
import styles from "@/app/admin/admin-theme.module.css";

const navigationItems = [
  { category: "COMMAND CENTER", items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }] },
  {
    category: "KNOWLEDGE",
    items: [
      { href: "/admin/brain", label: "Brain Review", icon: Brain },
      { href: "/admin/rag", label: "RAG Index", icon: Database },
      { href: "/admin/import", label: "Import", icon: Upload },
      { href: "/admin/feeds", label: "Feeds", icon: Package },
    ],
  },
  {
    category: "AI OPERATIONS",
    items: [
      { href: "/admin/agents", label: "Agent Runs", icon: Bot },
      { href: "/admin/agent-chat", label: "Agent Chat", icon: MessageSquare },
    ],
  },
  {
    category: "CONTENT",
    items: [
      { href: "/admin/articles", label: "Articles", icon: FileText },
      { href: "/admin/drafts", label: "Drafts", icon: FileText },
      { href: "/admin/content", label: "Content", icon: FileText },
      { href: "/admin/submissions", label: "Submissions", icon: MessageSquare },
      { href: "/admin/email-templates", label: "Email", icon: Mail },
    ],
  },
  {
    category: "AUTOMATION",
    items: [
      { href: "/admin/workflow", label: "Workflows", icon: Workflow },
      { href: "/admin/controllers", label: "Controllers", icon: Activity },
    ],
  },
  {
    category: "OPERATIONS",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/usage", label: "Usage", icon: BarChart3 },
      { href: "/admin/costs", label: "AI Costs", icon: DollarSign },
      { href: "/admin/system", label: "System Health", icon: Server },
    ],
  },
  {
    category: "TOOLS",
    items: [
      { href: "/admin/estimator", label: "Estimator", icon: Calculator },
      { href: "/admin/finance", label: "Finance", icon: DollarSign },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
 ];

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Brain,
  Calculator,
  Database,
  DollarSign,
  FileText,
  Gauge,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Package,
  Settings,
  Shield,
  Upload,
  Workflow,
  X,
  Bot,
  Server,
} from "lucide-react";
import styles from "@/app/admin/admin-theme.module.css";

const navigationItems = [
  { category: "COMMAND CENTER", items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }] },
  {
    category: "AGENT OPERATIONS",
    items: [
      { href: "/admin/agents", label: "Agents", icon: Bot },
      { href: "/admin/agent-chat", label: "Agent Chat", icon: MessageSquare },
      { href: "/admin/controllers", label: "Controllers", icon: Activity },
      { href: "/admin/deployments", label: "Deployments", icon: Server },
    ],
  },
  {
    category: "WORKFLOW ORCHESTRATION",
    items: [
      { href: "/admin/workflow", label: "Workflow", icon: Workflow },
      { href: "/admin/import", label: "Bulk Import", icon: Upload },
      { href: "/admin/feeds", label: "Feeds", icon: Package },
    ],
  },
  {
    category: "INTELLIGENCE",
    items: [
      { href: "/admin/brain", label: "AI Brain", icon: Brain },
      { href: "/admin/memory", label: "Memory", icon: Database },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    category: "CONTENT OPERATIONS",
    items: [
      { href: "/admin/content", label: "Content", icon: FileText },
      { href: "/admin/articles", label: "Articles", icon: FileText },
      { href: "/admin/drafts", label: "Drafts", icon: FileText },
      { href: "/admin/insights", label: "Insights", icon: Gauge },
      { href: "/admin/email-templates", label: "Email Templates", icon: Mail },
      { href: "/admin/submissions", label: "Submissions", icon: MessageSquare },
    ],
  },
  {
    category: "FINANCE & PLANNING",
    items: [
      { href: "/admin/finance", label: "Finance", icon: DollarSign },
      { href: "/admin/costs", label: "Costs", icon: DollarSign },
      { href: "/admin/usage", label: "Usage", icon: BarChart3 },
      { href: "/admin/estimator", label: "Estimator", icon: Calculator },
      { href: "/admin/payments", label: "Payments", icon: DollarSign },
    ],
  },
  {
    category: "SYSTEM & SECURITY",
    items: [
      { href: "/admin/system", label: "System", icon: Server },
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/settings/2fa", label: "Two-factor Auth", icon: Shield },
    ],
  },
];

export default function AdminSidebar({
  open,
  onClose,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`${styles.sidebar} fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-col border-r shadow-2xl shadow-black/40 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:sticky lg:top-0 ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      aria-label="Admin navigation"
    >
      <div className="border-b border-slate-800/80 p-5">
        <div className="flex items-center justify-between gap-3">
          <Link href="/admin" className="flex items-center gap-3" onClick={onClose}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-amber-400 to-cyan-400 text-sm font-black text-white shadow-lg shadow-cyan-400/20">
              LF
            </span>
            <span>
              <span className="block text-base font-bold text-white">Logixa Flow</span>
              <span className="text-xs text-slate-500">Admin command center</span>
            </span>
          </Link>
          <button type="button" onClick={onClose} className={`${styles.closeButton} text-slate-400 hover:text-white lg:hidden`} aria-label="Close sidebar">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto p-4" aria-label="Admin sections">
        {navigationItems.map((section) => (
          <div key={section.category}>
            <h2 className="mb-2 px-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-slate-500">{section.category}</h2>
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={`${styles.navLink} ${active ? styles.navLinkActive : ""} flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-slate-800/80 p-4">
        <button type="button" onClick={onLogout} className={`${styles.navLink} flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors`}>
          <Shield className="h-4 w-4" aria-hidden="true" />
          Logout
        </button>
      </div>
    </aside>
  );
}
