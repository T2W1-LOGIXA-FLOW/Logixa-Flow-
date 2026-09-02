import { AlertTriangle, CloudOff, DatabaseZap, KeyRound, ServerOff } from "lucide-react";
import styles from "@/app/admin/agents/agent-theme.module.css";

type AgentErrorKind = "api" | "provider" | "fallback" | "stale" | "empty" | "permission";

const config: Record<AgentErrorKind, { title: string; detail: string; Icon: typeof CloudOff }> = {
  api: { title: "API unavailable", detail: "The admin agent API could not be reached.", Icon: CloudOff },
  provider: { title: "Provider unavailable", detail: "The configured provider did not return a response.", Icon: ServerOff },
  fallback: { title: "Fallback response", detail: "The response came from the configured local fallback.", Icon: AlertTriangle },
  stale: { title: "Data unavailable or stale", detail: "The current view does not include a live status signal.", Icon: DatabaseZap },
  empty: { title: "No agent data", detail: "No persisted records were returned for this view.", Icon: DatabaseZap },
  permission: { title: "Permission denied", detail: "Your admin session cannot access this agent operation.", Icon: KeyRound },
};

export default function AdminAgentErrorState({ kind, detail }: { kind: AgentErrorKind; detail?: string }) {
  const state = config[kind];
  const Icon = state.Icon;
  return (
    <div className={styles.errorState} role={["api", "provider", "permission"].includes(kind) ? "alert" : undefined}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className={styles.errorTitle}>{state.title}</span>
      </div>
      <p className={styles.errorDetail}>{detail || state.detail}</p>
    </div>
  );
}
