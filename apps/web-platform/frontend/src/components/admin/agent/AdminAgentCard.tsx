import Link from "next/link";
import AdminCard from "@/components/admin/AdminCard";
import AdminAgentStatusBadge from "./AdminAgentStatusBadge";
import styles from "@/app/admin/agents/agent-theme.module.css";
import type { AgentRun } from "@/components/api";
import AdminAgentTimeline from "./AdminAgentTimeline";
import { Brain, Cpu, Layers, Clock } from "lucide-react";

export default function AdminAgentCard({ run }: { run: AgentRun }) {
  const memoryStatus = run.memory?.status ?? (run.final_memory_id ? "Linked" : "Staged");

  return (
    <AdminCard className="overflow-hidden border border-slate-800/80 bg-slate-900/60 shadow-xl backdrop-blur-md hover:border-cyan-500/40 transition-all">
      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <div className="flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 text-cyan-400" />
            <span className={styles.eyebrow}>Agent run #{run.id}</span>
          </div>
          <AdminAgentStatusBadge status={run.status} />
        </div>
        <h2 className={styles.objective}>{run.objective}</h2>

        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs">
          <div>
            <p className={styles.metaLabel}>Model</p>
            <p className="mt-1 font-mono font-medium text-slate-200 capitalize">
              {run.model || "openrouter-free"}
            </p>
          </div>
          <div>
            <p className={styles.metaLabel}>Memory Review</p>
            <p className="mt-1 font-medium text-amber-400 capitalize">{memoryStatus}</p>
          </div>
          <div>
            <p className={styles.metaLabel}>Pipeline Steps</p>
            <p className="mt-1 font-medium text-slate-200">
              {run.steps?.length ?? 0} executed
            </p>
          </div>
          <div>
            <p className={styles.metaLabel}>Created</p>
            <p className="mt-1 text-slate-300">
              {run.created_at
                ? new Date(run.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    month: "short",
                    day: "numeric",
                  })
                : "Recent"}
            </p>
          </div>
        </div>

        <div className={styles.metaRow}>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-500" />
            Updated {run.updated_at ? new Date(run.updated_at).toLocaleTimeString() : "Just now"}
          </span>
          {run.memory ? (
            <Link
              href="/admin/brain"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:underline"
            >
              <Brain className="h-3 w-3" />
              Review in Brain
            </Link>
          ) : (
            <span className="text-[11px] text-slate-500">Execution verified</span>
          )}
        </div>

        <AdminAgentTimeline steps={run.steps} />
      </div>
    </AdminCard>
  );
}
