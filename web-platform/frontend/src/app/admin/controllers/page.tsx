"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Skeleton from "@/components/shadcn/Skeleton";
import { adminFetch } from "@/components/api";
import { Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { AnimatedText } from "@/components/ui/animated-shiny-text";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb";
import AdminSearchBar from "@/components/admin/AdminSearchBar";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

interface Controller {
  id: string;
  name: string;
  trigger_type: string;
  enabled: boolean;
  last_execution: string;
  success_count: number;
  failure_count: number;
}

export default function AdminControllersPage() {
  const { token, isAuthenticated } = useAdminAuth();
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadControllers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminFetch("/api/admin/controllers", token);
      const data = await response.json();
      setControllers(Array.isArray(data) ? data : []);
      setError(null);
    } catch {
      setError("Failed to load controllers");
      toast.error("Could not load controllers");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }
    loadControllers();
  }, [token, isAuthenticated, loadControllers]);

  async function toggleController(id: string, enabled: boolean) {
    try {
      await adminFetch(`/api/admin/controllers/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !enabled }),
      });
      toast.success("Controller updated");
      loadControllers();
    } catch {
      toast.error("Failed to update controller");
    }
  }

  const filteredControllers = controllers.filter(controller =>
    controller.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    controller.trigger_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <main className="page-shell">
        <div className="max-w-4xl mx-auto py-8 space-y-6">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <AdminBreadcrumb currentPage="Controllers" />

      <section className="agent-header">
        <div>
          <p className="eyebrow">Automation</p>
          <AnimatedText
            text="Controllers"
            gradientColors="linear-gradient(90deg, #a855f7, #ffffff, #f97316)"
            gradientAnimationDuration={1.5}
            hoverEffect={true}
            textClassName="font-black text-3xl md:text-4xl"
            className="py-0"
          />
          <p className="text-muted">Manage automation workflows and triggers</p>
        </div>
        <Link className="ghost-button inline-flex items-center gap-2" href="/admin/brain">
          <Plus className="h-4 w-4" />
          New Workflow
        </Link>
      </section>

      {error && <p className="admin-status error">{error}</p>}

      <AdminSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search controllers..."
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : filteredControllers.length === 0 ? (
        <AdminEmptyState
          title={searchQuery ? "No controllers found" : "No controllers configured"}
          description={searchQuery ? "No controllers found matching your search" : "Configure your first automation controller"}
          actionLabel="Configure Controllers"
          actionHref="/admin"
        />
      ) : (
        <div className="space-y-4">
          {filteredControllers.map((controller) => (
            <div key={controller.id} className="admin-panel group hover:bg-slate-800/50 transition-all">
              <div className="flex items-center justify-between gap-6 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-primary group-hover:text-cyan-300 transition truncate">{controller.name}</h3>
                    {controller.enabled ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-secondary">Trigger: {controller.trigger_type}</p>
                  <div className="flex items-center gap-6 mt-3 text-xs text-muted flex-wrap">
                    <span>Last run: {new Date(controller.last_execution).toLocaleString()}</span>
                    <span>Success: <span className="text-success font-medium">{controller.success_count}</span></span>
                    <span>Failed: <span className="text-error font-medium">{controller.failure_count}</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 flex-wrap justify-end">
                  <button
                    onClick={() => toggleController(controller.id, controller.enabled)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      controller.enabled
                        ? "bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30"
                        : "bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 border border-slate-500/30"
                    }`}
                  >
                    {controller.enabled ? "Active" : "Inactive"}
                  </button>
                  <Link href={`/admin?edit=controller:${controller.id}`} className="text-accent hover:text-cyan-200 transition font-medium">
                    Edit
                  </Link>
                  <button className="text-error hover:text-red-200 transition font-medium">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
