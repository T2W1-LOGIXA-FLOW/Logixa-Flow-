import Link from "next/link";
import AdminCard from "@/components/admin/AdminCard";
import AdminAgentStatusBadge from "./AdminAgentStatusBadge";
import styles from "@/app/admin/agents/agent-theme.module.css";
import type { AgentRun } from "@/components/api";
import AdminAgentTimeline from "./AdminAgentTimeline";
import { Brain, Cpu, Clock, AlertTriangle, RefreshCw } from "lucide-react";

export default function AdminAgentCard({ run, onRetry, retrying = false }: { run: AgentRun; onRetry: (runId: number) => void; retrying?: boolean }) {
  const memoryStatus = run.memory?.status ?? (run.final_memory_id ? "Linked" : "Not created");
  const latestStep = run.steps?.[run.steps.length - 1];
  const isFailed = run.status.toLowerCase() === "failed";

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

        {isFailed && (
          <section
            className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3"
            aria-label="Run failure summary"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Execution failed
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              {latestStep?.message ? `Last recorded step: ${latestStep.message}` : "The run stopped before a final result was recorded. Inspect persisted execution history for the last completed step."}
            </p>
            <p className="mt-2 text-[11px] text-slate-400">
              A manual retry resumes from the last completed checkpoint. Its result stays private and still requires human approval.
            </p>
            {(run.retry_count ?? 0) < 1 && !run.final_memory_id && !run.memory ? (
              <button
                type="button"
                onClick={() => onRetry(run.id)}
                disabled={retrying}
                className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw className={"h-3.5 w-3.5 " + (retrying ? "animate-spin" : "")} aria-hidden="true" />
                {retrying ? "Queueing retry…" : "Retry failed run"}
              </button>
            ) : (
              <p className="mt-2 text-[11px] font-semibold text-amber-300">One-time retry limit reached or a Brain item is already linked.</p>
            )}
          </section>
        )}

        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs">
          <div>
            <p className={styles.metaLabel}>Model</p>
            <p className="mt-1 font-mono font-medium text-slate-200">
              {!run.model || run.model === "pending" ? "Not assigned yet" : run.model}
            </p>
          </div>
          <div>
            <p className={styles.metaLabel}>Memory status</p>
            <p className="mt-1 font-medium text-amber-400 capitalize">{memoryStatus}</p>
          </div>
          <div>
            <p className={styles.metaLabel}>Pipeline Steps</p>
            <p className="mt-1 font-medium text-slate-200">
              {run.steps?.length ?? 0} recorded
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
                : "Time unavailable"}
            </p>
          </div>
        </div>

        <div className={styles.metaRow}>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-500" aria-hidden="true" />
            Updated {run.updated_at ? new Date(run.updated_at).toLocaleTimeString() : "Time unavailable"}
          </span>
          {run.memory ? (
            <Link
              href="/admin/brain"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:underline"
            >
              <Brain className="h-3 w-3" aria-hidden="true" />
              Review in Brain
            </Link>
          ) : (
            <span className="text-[11px] text-slate-500">
              {isFailed ? "No completed result" : "No linked Brain item"}
            </span>
          )}
        </div>

        <AdminAgentTimeline steps={run.steps} />
      </div>
    </AdminCard>
  );
}
