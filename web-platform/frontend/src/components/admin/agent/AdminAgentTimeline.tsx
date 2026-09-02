import type { AgentStep } from "@/components/api";
import styles from "@/app/admin/agents/agent-theme.module.css";

export default function AdminAgentTimeline({ steps }: { steps: AgentStep[] | undefined }) {
  return (
    <section className={styles.timeline} aria-label="Persisted execution history">
      <div>
        <h3 className={styles.timelineTitle}>Persisted execution history</h3>
        <p className={styles.muted}>This is stored history, not a live execution stream.</p>
      </div>
      {steps?.length ? (
        <ol className={styles.timelineList}>
          {steps.map((step) => (
            <li key={step.id} className={styles.timelineItem}>
              <span className={styles.timelineDot} aria-hidden="true" />
              <div>
                <div className={styles.timelineHeader}>
                  <strong className="text-sm text-slate-100">{step.step_order}. {step.agent}</strong>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recorded</span>
                </div>
                <p className={styles.timelineDetail}>{step.message}</p>
                <p className={styles.muted}>{step.created_at ? new Date(step.created_at).toLocaleString() : "Timestamp not available"}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.muted}>NOT AVAILABLE — no persisted steps were returned.</p>
      )}
    </section>
  );
}
