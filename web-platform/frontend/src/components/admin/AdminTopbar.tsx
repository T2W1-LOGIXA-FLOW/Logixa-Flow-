"use client";

import { Menu } from "lucide-react";
import AdminStatusBadge from "./AdminStatusBadge";
import styles from "@/app/admin/admin-theme.module.css";

export default function AdminTopbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  return (
    <header className={`${styles.topbar} sticky top-0 z-30 border-b backdrop-blur-xl`}>
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenSidebar}
          className={`${styles.menuButton} rounded-lg border border-slate-700/80 bg-slate-900/80 p-2 text-slate-300 hover:text-white lg:hidden`}
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="hidden min-w-0 items-center gap-2 text-xs text-slate-400 sm:flex">
          <span className="truncate font-semibold uppercase tracking-[0.18em] text-slate-500">Operations</span>
          <span aria-hidden="true">/</span>
          <span className="truncate">Admin workspace</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <AdminStatusBadge label="Admin workspace" tone="cyan" />
        </div>
      </div>
    </header>
  );
}
