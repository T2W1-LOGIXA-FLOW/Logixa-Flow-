"use client";

type ConnectionState = "connecting" | "connected" | "disconnected";

type ProcessCostPanelProps = {
  status?: string;
  currentNode?: string | null;
  logs?: string[];
  connectionState?: ConnectionState;
};

export default function ProcessCostPanel({
  status = "queued",
  currentNode = null,
  logs = [
    "[20:47:12] ROUTER  OK",
    "[20:47:09] INDEXER READY",
    "[20:46:51] MEDIA WAIT",
    "[20:45:20] OUTBOUND RETRY",
  ],
  connectionState = "connected",
}: ProcessCostPanelProps) {
  const statusTone = status === "failed" ? "log-red" : status === "running" ? "log-amber" : "log-green";
  const indicatorTone = connectionState === "connected" ? "status-green" : connectionState === "connecting" ? "status-amber" : "status-red";

  return (
    <aside className="process-cost-panel" aria-label="Process cost panel">
      <div className="process-cost-header">
        <span className="workflow-kicker">PROCESS TELEMETRY</span>
        <span className={`status-dot ${indicatorTone}`} />
        {connectionState === "connected" ? "LIVE" : connectionState === "connecting" ? "SYNCING" : "OFFLINE"}
      </div>
      <div className="process-cost-metrics">
        <div><span>STATUS</span><strong>{status.toUpperCase()}</strong></div>
        <div><span>NODE</span><strong>{currentNode ?? "IDLE"}</strong></div>
      </div>
      <div className="process-log" aria-label="Recent process logs">
        {logs.map((log, index) => (
          <p key={`${log}-${index}`} className={statusTone}>{log}</p>
        ))}
      </div>
    </aside>
  );
}
