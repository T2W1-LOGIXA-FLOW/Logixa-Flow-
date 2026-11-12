"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, BarChart3, Brain, Calculator, Database, DollarSign, FileText,
  LayoutDashboard, Mail, MessageSquare, Package, Settings, Shield, Upload,
  Workflow, X, Bot, Server, CreditCard, Rocket, Lightbulb, MessagesSquare, Plug,
} from "lucide-react";
import styles from "@/app/admin/admin-theme.module.css";
import { LogixaFlowLogo } from "@/components/LogixaFlowLogo";

const navigationItems = [
  { category: "COMMAND CENTER", items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }] },
  { category: "KNOWLEDGE", items: [
    { href: "/admin/brain", label: "Brain Review", icon: Brain },
    { href: "/admin/memory", label: "Memory", icon: Database },
    { href: "/admin/rag", label: "RAG Index", icon: Database },
    { href: "/admin/import", label: "Import", icon: Upload },
    { href: "/admin/feeds", label: "Feeds", icon: Package },
  ]},
  { category: "AI OPERATIONS", items: [
    { href: "/admin/agents", label: "Agent Runs", icon: Bot },
    { href: "/admin/agent-chat", label: "Agent Chat", icon: MessageSquare },
    { href: "/admin/chat", label: "Conversations", icon: MessagesSquare },
  ]},
  { category: "CONTENT", items: [
    { href: "/admin/articles", label: "Articles", icon: FileText },
    { href: "/admin/drafts", label: "Drafts", icon: FileText },
    { href: "/admin/content", label: "Content", icon: FileText },
    { href: "/admin/insights", label: "Insights", icon: Lightbulb },
    { href: "/admin/submissions", label: "Submissions", icon: MessageSquare },
    { href: "/admin/email-templates", label: "Email templates", icon: Mail },
  ]},
  { category: "AUTOMATION", items: [
    { href: "/admin/workflow", label: "Workflows", icon: Workflow },
    { href: "/admin/integrations", label: "Integrations", icon: Plug },
    { href: "/admin/controllers", label: "Controllers", icon: Activity },
  ]},
  { category: "OPERATIONS", items: [
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/usage", label: "Usage", icon: BarChart3 },
    { href: "/admin/costs", label: "AI costs", icon: DollarSign },
    { href: "/admin/finance", label: "Finance", icon: DollarSign },
    { href: "/admin/payments", label: "Payments", icon: CreditCard },
    { href: "/admin/system", label: "System health", icon: Server },
    { href: "/admin/deployments", label: "Deployments", icon: Rocket },
  ]},
  { category: "TOOLS & CONFIGURATION", items: [
    { href: "/admin/estimator", label: "Estimator", icon: Calculator },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ]},
];

export default function AdminSidebar({
  open, onClose, onLogout,
}: { open: boolean; onClose: () => void; onLogout: () => void }) {
  const pathname = usePathname();

  return (
    <aside
      id="admin-navigation"
      className={`${styles.sidebar} fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-64 flex-col border-r shadow-2xl shadow-black/40 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen ${open ? "visible translate-x-0" : "invisible -translate-x-full lg:visible lg:translate-x-0"}`}
      aria-label="Admin navigation"
    >
      <div className="border-b border-slate-800/80 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/admin" className="flex min-w-0 items-center gap-3" onClick={onClose} aria-label="Logixa Flow admin overview">
            <LogixaFlowLogo size={36} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-wide text-slate-100">LOGIXA FLOW</span>
              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Operations console</span>
            </span>
          </Link>
          <button type="button" onClick={onClose} className={`${styles.closeButton} rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden`} aria-label="Close sidebar">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto overscroll-contain p-3" aria-label="Admin sections">
        {navigationItems.map((section) => (
          <section key={section.category} aria-label={section.category}>
            <h2 className="mb-2 px-3 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-slate-500">{section.category}</h2>
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
                    className={`${styles.navLink} ${active ? styles.navLinkActive : ""} flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-[0.82rem] transition-colors`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
      <div className="border-t border-slate-800/80 p-4">
        <button type="button" onClick={onLogout} className={`${styles.navLink} flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors`}>
          <Shield className="h-4 w-4" aria-hidden="true" />Logout
        </button>
      </div>
    </aside>
  );
}
