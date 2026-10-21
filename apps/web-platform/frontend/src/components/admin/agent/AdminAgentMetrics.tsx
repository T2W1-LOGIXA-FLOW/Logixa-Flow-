import AdminMetricCard from "@/components/admin/AdminMetricCard";
import type { AgentRun } from "@/components/api";
import styles from "@/app/admin/agents/agent-theme.module.css";

export default function AdminAgentMetrics({
  runs,
  providerStatus,
}: {
  runs: AgentRun[];
  providerStatus?: string;
}) {
  const totalSteps = runs.reduce(
    (total, run) => total + (Array.isArray(run.steps) ? run.steps.length : 0),
    0
  );

  const completedCount = runs.filter(
    (run) => run.status?.toLowerCase() === "completed"
  ).length;

  const successRate = runs.length
    ? `${Math.round((completedCount / runs.length) * 100)}%`
    : "100%";

  const pendingMemories = runs.filter(
    (run) => run.memory?.status === "pending"
  ).length;

  // Extract distinct models
  const distinctModels = Array.from(
    new Set(runs.map((r) => r.model).filter(Boolean))
  );
  const primaryProvider =
    providerStatus ||
    (distinctModels.length > 0 ? distinctModels.slice(0, 2).join(", ") : "OpenRouter / Gemini");

  return (
    <div className={styles.metricGrid} aria-label="Agent metrics">
      <AdminMetricCard
        label="Loaded runs"
        value={runs.length}
        detail="Current API result set"
      />
      <AdminMetricCard
        label="Success rate"
        value={successRate}
        detail={`${completedCount} of ${runs.length} completed`}
      />
      <AdminMetricCard
        label="Step count"
        value={totalSteps}
        detail={`Avg ${runs.length ? Math.round(totalSteps / runs.length) : 0} steps/run`}
      />
      <AdminMetricCard
        label="Memory status"
        value={`${pendingMemories} pending`}
        detail="Pending human review"
      />
      <AdminMetricCard
        label="Active engine"
        value={primaryProvider}
        detail="Orchestrated AI models"
      />
    </div>
  );
}
