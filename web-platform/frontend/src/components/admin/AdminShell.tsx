"use client";

import Link from "next/link";
import { ArrowUpRight, RefreshCw, Server } from "lucide-react";
import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import styles from "@/app/admin/admin-theme.module.css";

export default function AdminShell({
  children,
  onLogout,
}: {
  children: React.ReactNode;
  onLogout: () => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const closeSidebar = () => setSidebarOpen(false);
  const refresh = () => {
    setIsRefreshing(true);
    window.setTimeout(() => window.location.reload(), 250);
  };

  return (
    <div className={`${styles.shell} admin-shell flex min-h-screen`}>
      {sidebarOpen ? <div className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-sm lg:hidden" onClick={closeSidebar} aria-hidden="true" /> : null}
      <AdminSidebar open={sidebarOpen} onClose={closeSidebar} onLogout={onLogout} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-[radial-gradient(circle_at_50%_0%,rgba(14,165,233,0.10),transparent_32%),#020617]">
        <AdminTopbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-x-hidden px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
        <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800/80 bg-slate-950/90 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-end gap-2">
            <button type="button" onClick={refresh} className={styles.action} aria-busy={isRefreshing}>
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </button>
            <Link href="/admin/system" className={styles.action}><Server className="h-3.5 w-3.5" aria-hidden="true" />System</Link>
            <Link href="/" className={styles.action}><ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />Open site</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
