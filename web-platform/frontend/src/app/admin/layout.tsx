"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  FileEdit,
  Newspaper,
  Bot,
  Settings,
  BarChart3,
  Calculator,
  Server,
  Rss,
  Brain,
  CreditCard,
  DollarSign,
  Mail,
  MessageSquare,
  LogOut,
  Menu,
  ShieldCheck,
  UserCog,
  X
} from "lucide-react";
import { useState } from "react";
import { useEffect } from "react";
import { validateAdminToken } from "@/components/api";
import { clearAdminSession, getAdminSessionToken } from "@/lib/adminSession";

const navigationItems = [
  {
    category: "OVERVIEW",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/system", label: "System Status", icon: Server },
    ],
  },
  {
    category: "INSIGHTS",
    items: [
      { href: "/admin/insights", label: "All Insights", icon: FileText },
      { href: "/admin/drafts", label: "Drafts", icon: FileEdit },
      { href: "/admin/articles", label: "Articles", icon: Newspaper },
      { href: "/admin/submissions", label: "Submissions", icon: ShieldCheck },
    ],
  },
  {
    category: "AI AGENT",
    items: [
      { href: "/agent", label: "Agent Control", icon: Bot },
      { href: "/admin/agent-chat", label: "Agent Chat", icon: MessageSquare },
      { href: "/admin/brain", label: "Brain Queue", icon: Brain },
      { href: "/admin/agents", label: "Agent Profiles", icon: UserCog },
      { href: "/admin/controllers", label: "Controllers", icon: Settings },
    ],
  },
  {
    category: "OPERATIONS",
    items: [
      { href: "/admin/feeds", label: "Feeds", icon: Rss },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/costs", label: "Finance & Costs", icon: DollarSign },
      { href: "/admin/estimator", label: "Estimator", icon: Calculator },
    ],
  },
  {
    category: "SETTINGS",
    items: [
      { href: "/admin/settings", label: "Admin Settings", icon: Settings },
      { href: "/admin/settings/2fa", label: "Two-factor Auth", icon: ShieldCheck },
      { href: "/admin/payments", label: "Payments", icon: CreditCard },
      { href: "/admin/email-templates", label: "Email Templates", icon: Mail },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const isLoginRoute = pathname === "/admin/login";

  const handleLogout = () => {
    clearAdminSession();
    window.location.href = "/admin/login";
  };

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const bypassAuth = typeof process !== "undefined" && process.env.NEXT_PUBLIC_ADMIN_AUTH_BYPASS === "true";
      if (bypassAuth || isLoginRoute) {
        setAuthChecked(true);
        return;
      }
      const token = getAdminSessionToken();
      if (!token || !(await validateAdminToken(token))) {
        if (cancelled) return;
        clearAdminSession();
        window.location.href = "/admin/login";
        return;
      }
      if (!cancelled) {
        setAuthChecked(true);
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [isLoginRoute]);

  // Set document title dynamically
  useEffect(() => {
    const pageName = pathname.split("/").pop() || "Admin";
    document.title = `${pageName.charAt(0).toUpperCase() + pageName.slice(1)} - Logixa Flow Admin`;
  }, [pathname]);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-300 flex items-center justify-center">
        Checking admin session...
      </div>
    );
  }

  return (
    <div className="admin-shell flex min-h-screen bg-slate-950 text-slate-100">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50
          w-[18rem] border-r border-cyan-400/10 bg-slate-950/95
          shadow-2xl shadow-black/40 backdrop-blur-xl
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex h-screen flex-col
        `}
      >
        {/* Header */}
        <div className="border-b border-slate-800/80 p-5">
          <div className="flex items-center justify-between gap-3">
            <Link href="/admin" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-sky-500 to-orange-400 text-sm font-black text-white shadow-lg shadow-cyan-500/20">
                LF
              </span>
              <span>
                <span className="block text-base font-bold text-white">
                  Logixa Flow
                </span>
                <span className="text-xs text-slate-500">Admin command center</span>
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white transition"
              aria-label="Close sidebar"
              title="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {navigationItems.map((section) => (
            <div key={section.category}>
              <h3 className="mb-3 px-3 text-[0.68rem] font-bold uppercase tracking-[0.24em] text-slate-500">
                {section.category}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm
                        transition-all duration-200
                        ${isActive
                          ? 'border border-cyan-400/30 bg-cyan-500/10 text-cyan-100 shadow-[0_0_24px_rgba(14,165,233,0.12)]'
                          : 'border border-transparent text-slate-400 hover:border-slate-700/80 hover:bg-slate-900/80 hover:text-white'
                        }
                      `}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-800/80 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm
              text-slate-400 transition-all duration-200 hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-100"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-h-screen flex-1 flex-col bg-[radial-gradient(circle_at_50%_0%,rgba(14,165,233,0.10),transparent_32%),#020617]">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white transition"
              aria-label="Open sidebar"
              title="Open sidebar"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="hidden text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 lg:block">
              Admin Workspace
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                System Online
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
