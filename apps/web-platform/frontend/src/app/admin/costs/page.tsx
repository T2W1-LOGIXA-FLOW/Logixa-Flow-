"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CostDashboard from "@/components/CostDashboard";
import Skeleton from "@/components/shadcn/Skeleton";
import { getAdminSessionToken } from "@/lib/adminSession";

export default function AdminCostsPage() {
  const router = useRouter();
  const [token, setToken] = useState("");

  useEffect(() => {
    let cancelled = false;
    getAdminSessionToken().then((savedToken) => {
      if (cancelled) return;
      if (!savedToken) {
        router.push("/admin/login");
        return;
      }
      setToken(savedToken);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!token) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <header className="rounded-3xl border border-cyan-400/15 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Finance Control</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Cloud Cost Planning</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Track free-tier readiness, API spend assumptions, and upgrade decisions before moving services to paid scale.
        </p>
      </header>

      <CostDashboard token={token} />
    </div>
  );
}
