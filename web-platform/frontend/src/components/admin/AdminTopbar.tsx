"use client";

import { Menu, Sparkles } from "lucide-react";
import AdminStatusBadge from "./AdminStatusBadge";
import styles from "@/app/admin/admin-theme.module.css";

export default function AdminTopbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  return (
    <header className={`${styles.topbar} sticky top-0 z-30 border-b backdrop-blur-xl`}>
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button type="button" onClick={onOpenSidebar} className={`${styles.menuButton} rounded-lg border border-slate-700/80 bg-slate-900/80 p-2 text-slate-300 hover:text-white lg:hidden`} aria-label="Open sidebar">
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="hidden min-w-0 items-center gap-2 text-xs text-slate-400 sm:flex">
          <span className="truncate font-semibold uppercase tracking-[0.18em] text-slate-500">Operations</span>
          <span aria-hidden="true">/</span>
          <span className="truncate">Admin command center</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <AdminStatusBadge label="Ops online" tone="success" />
          <span className="hidden sm:inline-flex"><AdminStatusBadge label="User AI" tone="cyan" /></span>
          <span className="hidden md:inline-flex"><AdminStatusBadge label="Admin AI" tone="violet" /></span>
          <span className="hidden items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-300 lg:inline-flex">
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
            Status stable
          </span>
        </div>
      </div>
    </header>
  );
}
