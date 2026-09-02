import AdminMetricCard from "@/components/admin/AdminMetricCard";
import type { AgentRun } from "@/components/api";
import styles from "@/app/admin/agents/agent-theme.module.css";

export default function AdminAgentMetrics({
  runs,
  providerStatus = "NOT AVAILABLE",
}: {
  runs: AgentRun[];
  providerStatus?: string;
}) {
  const stepsAvailable = runs.every((run) => Array.isArray(run.steps));
  const stepCount = stepsAvailable
    ? runs.reduce((total, run) => total + run.steps.length, 0)
    : "NOT AVAILABLE";
  const sourceCount = "Not available";
  const memoryStatus = runs.length
    ? `${runs.filter((run) => run.memory?.status === "pending").length} pending`
    : "0 pending";

  return (
    <div className={styles.metricGrid} aria-label="Agent metrics">
      <AdminMetricCard label="Loaded runs" value={runs.length} detail="Current API result set" />
      <AdminMetricCard label="Source count" value={sourceCount} detail="Not returned by the runs API" />
      <AdminMetricCard label="Step count" value={stepCount} detail="Persisted steps in current view" />
      <AdminMetricCard label="Memory status" value={memoryStatus} detail="Linked memory records" />
      <AdminMetricCard label="Provider" value={providerStatus === "NOT AVAILABLE" ? "Not available" : providerStatus} detail="No provider status loaded on this page" />
    </div>
  );
}
