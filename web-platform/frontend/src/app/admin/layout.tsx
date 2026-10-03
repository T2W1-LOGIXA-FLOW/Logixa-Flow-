"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { validateAdminToken } from "@/components/api";
import { clearAdminSession, getAdminSessionToken } from "@/lib/adminSession";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);
  const isLoginRoute = pathname === "/admin/login";

  const handleLogout = () => {
    clearAdminSession();
    window.location.href = "/admin/login";
  };

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      if (isLoginRoute) {
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
      if (!cancelled) setAuthChecked(true);
    }

    checkSession();
    return () => {
      cancelled = true;
    };
  }, [isLoginRoute]);

  useEffect(() => {
    const pageName = pathname.split("/").pop() || "Admin";
    document.title = `${pageName.charAt(0).toUpperCase() + pageName.slice(1)} - Logixa Flow Admin`;
  }, [pathname]);

  if (isLoginRoute) return <>{children}</>;

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-300 flex items-center justify-center">
        Checking admin session...
      </div>
    );
  }

  return <AdminShell onLogout={handleLogout}>{children}</AdminShell>;
}
