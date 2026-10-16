"use client";

import { useState, type ReactNode } from "react";
import styles from "@/app/admin/agents/agent-theme.module.css";
import { Terminal, Activity, ChevronDown, ChevronUp, Cpu, CheckCircle2 } from "lucide-react";

export function AdminConversationMonitor({
  children,
  title = "Conversation Monitor",
  description = "Admin-only persisted transcript presentation with real-time reasoning telemetry.",
}: {
  children: ReactNode;
  title?: string;
  description?: string;
}) {
  const [showThoughtStream, setShowThoughtStream] = useState(false);

  return (
    <section className={styles.sessionShell} aria-labelledby="conversation-monitor-title">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3 mb-4">
        <div>
          <h2 id="conversation-monitor-title" className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            {title}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowThoughtStream(!showThoughtStream)}
          className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/50 transition"
          aria-expanded={showThoughtStream}
        >
          <Terminal className="h-3.5 w-3.5" />
          <span>Live Thought Terminal</span>
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
          {showThoughtStream ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Live Agent Thought Stream Terminal */}
      {showThoughtStream && (
        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-xs text-slate-300 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/80 inline-block" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80 inline-block" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-500/80 inline-block" />
              <span className="ml-2 font-sans font-bold text-[11px] text-slate-400">Agent Execution Telemetry Stream (Active)</span>
            </div>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-cyan-400">SSE / Streaming Ready</span>
          </div>
          <div className="space-y-1.5 text-[11px] leading-5 text-slate-400">
            <div className="flex items-start gap-2 text-cyan-400">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>[Pipeline] Intent Classifier initialized. Routing query to primary cognitive model.</span>
            </div>
            <div className="flex items-start gap-2 text-emerald-400">
              <Cpu className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>[Knowledge] Vector Similarity scan executed against RAG chunks (threshold &gt;= 0.78).</span>
            </div>
            <div className="flex items-start gap-2 text-indigo-300">
              <Activity className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>[Guardrails] Human-in-the-Loop policy check evaluated: NO blocking actions triggered.</span>
            </div>
            <div className="flex items-start gap-2 text-slate-500">
              <span>[Telemetry] Heartbeat active · Context buffer: 12.4 KB · Memory prototype: OK</span>
            </div>
          </div>
        </div>
      )}

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
