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
    <div className="flex min-h-screen bg-slate-950">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-slate-950 border-r border-slate-800
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-white">
              Logixa Flow
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white transition"
              aria-label="Close sidebar"
              title="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">Admin Dashboard</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {navigationItems.map((section) => (
            <div key={section.category}>
              <h3 className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-3 px-3">
                {section.category}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                        transition-all duration-200
                        ${isActive
                          ? 'bg-slate-800 text-white border-l-2 border-cyan-500 font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900 font-normal'
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
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm
              text-slate-400 hover:text-white hover:bg-slate-900 transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen bg-slate-950">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-slate-950 border-b border-slate-800 lg:pl-64">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white transition"
              aria-label="Open sidebar"
              title="Open sidebar"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                System Online
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-slate-950">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
