import AdminCard from "@/components/admin/AdminCard";
import AdminAgentStatusBadge from "./AdminAgentStatusBadge";
import styles from "@/app/admin/agents/agent-theme.module.css";
import type { AgentRun } from "@/components/api";
import AdminAgentTimeline from "./AdminAgentTimeline";

export default function AdminAgentCard({ run }: { run: AgentRun }) {
  const memoryStatus = run.memory?.status ?? "NOT AVAILABLE";

  return (
    <AdminCard className="overflow-hidden">
      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <span className={styles.eyebrow}>Agent run #{run.id}</span>
          <AdminAgentStatusBadge status={run.status} />
        </div>
        <h2 className={styles.objective}>{run.objective}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className={styles.metaLabel}>Model</p>
            <p className="mt-1 text-sm text-slate-200">{run.model || "NOT AVAILABLE"}</p>
          </div>
          <div>
            <p className={styles.metaLabel}>Memory</p>
            <p className="mt-1 text-sm text-slate-200">{memoryStatus}</p>
          </div>
          <div>
            <p className={styles.metaLabel}>Steps</p>
            <p className="mt-1 text-sm text-slate-200">{run.steps?.length ?? "NOT AVAILABLE"}</p>
          </div>
          <div>
            <p className={styles.metaLabel}>Created</p>
            <p className="mt-1 text-sm text-slate-200">{run.created_at ? new Date(run.created_at).toLocaleString() : "NOT AVAILABLE"}</p>
          </div>
        </div>
        <div className={styles.metaRow}>
        <span className={styles.muted}>
          Updated {run.updated_at ? new Date(run.updated_at).toLocaleString() : "NOT AVAILABLE"}
        </span>
        <span className="text-xs text-slate-500">Memory detail unavailable</span>
        </div>
        <AdminAgentTimeline steps={run.steps} />
      </div>
    </AdminCard>
  );
}
