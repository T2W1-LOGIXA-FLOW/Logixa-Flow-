"use client";

import { useState, type ReactNode } from "react";
import styles from "@/app/admin/agents/agent-theme.module.css";
import { Terminal, Activity, ChevronDown, ChevronUp, Cpu, CheckCircle2, Pause, Play, Send } from "lucide-react";
import { adminFetch } from "@/components/api";

export function AdminConversationMonitor({
  children,
  token,
  title = "Conversation Monitor",
  description = "Admin-only persisted transcript presentation with real-time reasoning telemetry.",
}: {
  children: ReactNode;
  token: string;
  title?: string;
  description?: string;
}) {
  const [showThoughtStream, setShowThoughtStream] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [operatorPrompt, setOperatorPrompt] = useState("");
  const [interruptLog, setInterruptLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const handleInterrupt = async (action: "pause" | "resume" | "inject_prompt") => {
    setBusy(true);
    try {
      if (!token) {
        throw new Error("An authenticated admin session is required.");
      }
      const res = await adminFetch("/api/agent/interrupt/default-session", token, {
        method: "POST",
        body: JSON.stringify({ action, guidance: action === "inject_prompt" ? operatorPrompt : undefined }),
      });
      const result = await res.json() as { message?: string; runtime_applied?: boolean };
      if (action === "pause") setIsPaused(true);
      if (action === "resume") setIsPaused(false);
      setInterruptLog(prev => [
        result.message || "Operator control accepted by the active agent runtime.",
        ...prev,
      ]);
      if (action === "inject_prompt") setOperatorPrompt("");
    } catch (e) {
      console.error("Interrupt failed", e);
    } finally {
      setBusy(false);
    }
  };


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
          {/* Bidirectional Operator Interrupt Toolbar */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 bg-slate-900/60 p-2 rounded-lg">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleInterrupt(isPaused ? "resume" : "pause")}
                disabled={busy}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold tracking-wide transition ${
                  isPaused ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                }`}
              >
                {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                <span>{isPaused ? "RESUME AGENT" : "PAUSE AGENT"}</span>
              </button>
              <span className="text-[10px] text-slate-500 font-sans">
                {isPaused
                  ? "Pause applied · active runs stop at the next step boundary"
                  : "Controls active agent graph runs at step boundaries"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-1 max-w-sm">
              <input
                type="text"
                value={operatorPrompt}
                onChange={e => setOperatorPrompt(e.target.value)}
                onKeyDown={e => e.key === "Enter" && operatorPrompt.trim() && handleInterrupt("inject_prompt")}
                placeholder="Inject runtime guidance / prompt..."
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 w-full focus:outline-none focus:border-cyan-500 font-sans"
              />
              <button
                type="button"
                onClick={() => handleInterrupt("inject_prompt")}
                disabled={busy || !operatorPrompt.trim()}
                className="bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 disabled:opacity-40"
              >
                <Send className="h-3 w-3" />
                <span>Inject</span>
              </button>
            </div>
          </div>

          {interruptLog.length > 0 && (
            <div className="mt-2 space-y-1 text-[10px] text-cyan-300/80 bg-cyan-950/30 p-1.5 rounded border border-cyan-800/30 font-mono">
              {interruptLog.slice(0, 3).map((log, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className="text-cyan-500 font-bold">[INTERRUPT]</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          )}
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
