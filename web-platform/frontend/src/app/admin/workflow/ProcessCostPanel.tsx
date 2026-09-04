"use client";

export default function ProcessCostPanel() {
  return (
    <aside className="process-cost-panel" aria-label="Process cost panel">
      <div className="process-cost-header"><span className="workflow-kicker">PROCESS TELEMETRY</span><span className="status-dot status-green" /> LIVE</div>
      <div className="process-cost-metrics">
        <div><span>RUN HOURS</span><strong>128.4h</strong></div>
        <div><span>EST. COST</span><strong>$42.18</strong></div>
      </div>
      <div className="process-log" aria-label="Recent process logs">
        <p className="log-green">[20:47:12] ROUTER  OK</p>
        <p className="log-green">[20:47:09] INDEXER  READY</p>
        <p className="log-amber">[20:46:51] MEDIA  WAIT</p>
        <p className="log-red">[20:45:20] OUTBOUND RETRY</p>
      </div>
    </aside>
  );
}
