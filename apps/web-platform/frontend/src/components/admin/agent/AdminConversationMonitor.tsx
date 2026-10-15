import type { ReactNode } from "react";
import styles from "@/app/admin/agents/agent-theme.module.css";

export function AdminConversationMonitor({
  children,
  title = "Conversation monitor",
  description = "Admin-only persisted transcript presentation. Session restoration and live monitoring are not connected.",
}: {
  children: ReactNode;
  title?: string;
  description?: string;
}) {
  return (
    <section className={styles.sessionShell} aria-labelledby="conversation-monitor-title">
      <div>
        <h2 id="conversation-monitor-title">{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}

export function AdminConversationMessage({
  role,
  content,
  timestamp,
  action,
}: {
  role: "user" | "agent";
  content: string;
  timestamp?: string;
  action?: ReactNode;
}) {
  return (
    <article className={`${styles.message} ${role === "user" ? styles.messageUser : ""}`}>
      <div className={styles.messageHeader}>
        <span className={styles.messageRole}>{role === "user" ? "Operator" : "Agent response"}</span>
        {action}
      </div>
      <p className={styles.messageText}>{content}</p>
      <p className={`${styles.muted} mt-2`}>{timestamp ? new Date(timestamp).toLocaleTimeString() : "Timestamp not available"}</p>
    </article>
  );
}
