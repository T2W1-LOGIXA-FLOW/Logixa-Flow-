"use client";

import { useCallback, useEffect, useState } from "react";
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
  last_execution: string | null;
  success_count: number;
  failure_count: number;
}

export default function AdminControllersPage() {
  const { token, isAuthenticated } = useAdminAuth();
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [controllerId, setControllerId] = useState("");
  const [controllerName, setControllerName] = useState("");
  const [workflowId, setWorkflowId] = useState("admin-command-canvas");
  const [submitting, setSubmitting] = useState(false);

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

  async function createController(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedId = controllerId.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
    const normalizedWorkflowId = workflowId.trim();
    if (normalizedId.length < 2 || !controllerName.trim() || !normalizedWorkflowId) {
      toast.error("Controller ID, name, and workflow ID are required");
      return;
    }
    setSubmitting(true);
    try {
      const workflowResponse = await adminFetch(
        `/api/admin/workflow/${encodeURIComponent(normalizedWorkflowId)}`,
        token,
      );
      const savedWorkflow = await workflowResponse.json() as { id?: string; nodes?: unknown[] };
      if (savedWorkflow.id !== normalizedWorkflowId || !Array.isArray(savedWorkflow.nodes) || savedWorkflow.nodes.length === 0) {
        throw new Error("Save a non-empty workflow in the Workflow command center before creating its controller.");
      }

      await adminFetch("/api/admin/controllers", token, {
        method: "POST",
        body: JSON.stringify({
          id: normalizedId,
          name: controllerName.trim(),
          trigger_type: "manual",
          enabled: true,
          config: JSON.stringify({ workflow_id: normalizedWorkflowId, priority: 1, delay_seconds: 0 }),
        }),
      });
      toast.success("Controller created");
      setControllerId("");
      setControllerName("");
      setWorkflowId("admin-command-canvas");
      setShowCreateForm(false);
      await loadControllers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create controller");
    } finally {
      setSubmitting(false);
    }
  }

  async function executeController(id: string) {
    try {
      const response = await adminFetch(`/api/admin/controllers/${encodeURIComponent(id)}/execute`, token, {
        method: "POST",
      });
      const result = await response.json() as { message?: string; run?: { run_id?: string } };
      toast.success(result.message ?? `Workflow queued${result.run?.run_id ? `: ${result.run.run_id}` : ""}`);
      await loadControllers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to queue controller workflow");
    }
  }

  async function deleteController(id: string) {
    if (typeof window !== "undefined" && !window.confirm(`Delete controller "${id}"?`)) return;
    try {
      await adminFetch(`/api/admin/controllers/${encodeURIComponent(id)}`, token, { method: "DELETE" });
      toast.success("Controller deleted");
      await loadControllers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete controller");
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
        <button
          type="button"
          className="ghost-button inline-flex items-center gap-2"
          onClick={() => setShowCreateForm((visible) => !visible)}
          aria-expanded={showCreateForm}
        >
          <Plus className="h-4 w-4" />
          {showCreateForm ? "Cancel" : "New Controller"}
        </button>
      </section>

      {showCreateForm && (
        <form onSubmit={createController} className="admin-panel space-y-4" aria-label="Create controller">
          <h2 className="text-lg font-semibold text-primary">Create manual workflow controller</h2>
          <p className="text-sm text-muted">
            The workflow must already be saved in the Workflow command center. This controller queues that workflow; it does not create external service integrations.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block text-sm text-secondary">
              Controller ID
              <input
                required
                minLength={2}
                maxLength={100}
                pattern="[A-Za-z0-9_-]+"
                value={controllerId}
                onChange={(event) => setControllerId(event.target.value)}
                placeholder="daily-ops"
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-primary"
              />
            </label>
            <label className="block text-sm text-secondary">
              Display name
              <input
                required
                minLength={2}
                maxLength={255}
                value={controllerName}
                onChange={(event) => setControllerName(event.target.value)}
                placeholder="Daily Operations"
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-primary"
              />
            </label>
            <label className="block text-sm text-secondary">
              Workflow ID
              <input
                required
                minLength={1}
                maxLength={80}
                pattern="[A-Za-z0-9_-]+"
                value={workflowId}
                onChange={(event) => setWorkflowId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-primary"
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className="primary-button">
              {submitting ? "Creating…" : "Create controller"}
            </button>
          </div>
        </form>
      )}

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
          description={searchQuery ? "No controllers found matching your search" : "Create a controller with New Controller above, then point it at a saved workflow."}
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
                    <span>Last run: {controller.last_execution ? new Date(controller.last_execution).toLocaleString() : "Never"}</span>
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
                  <button
                    type="button"
                    onClick={() => executeController(controller.id)}
                    disabled={!controller.enabled}
                    className="ghost-button disabled:opacity-50"
                  >
                    Run now
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteController(controller.id)}
                    className="text-error hover:text-red-200 transition font-medium"
                  >
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
