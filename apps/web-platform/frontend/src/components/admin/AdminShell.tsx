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
    window.location.reload();
  };

  return (
    <div className={`${styles.shell} admin-shell flex min-h-screen`}>
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
          aria-label="Close navigation"
        />
      ) : null}
      <AdminSidebar open={sidebarOpen} onClose={closeSidebar} onLogout={onLogout} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.07),transparent_34%),#080d18]">
        <AdminTopbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="min-w-0 flex-1 overflow-x-hidden px-4 pb-8 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
        <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/60 px-4 py-3">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={refresh} className={styles.action} aria-busy={isRefreshing}>
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh workspace
            </button>
            <Link href="/admin/system" className={styles.action}>
              <Server className="h-3.5 w-3.5" aria-hidden="true" />
              System health
            </Link>
            <Link href="/" className={styles.action}>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              Open public site
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
