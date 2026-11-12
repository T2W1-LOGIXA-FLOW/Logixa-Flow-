"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  Position,
  useEdgesState,
  useNodesState,
  addEdge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { getAdminSessionToken } from "@/lib/adminSession";
import ProcessCostPanel from "./ProcessCostPanel";
import WorkflowSidebar, { type ServiceModule } from "./WorkflowSidebar";
import NodeInspectorDrawer, { type ServiceNodeData } from "./NodeInspectorDrawer";
import "./page.css";

type WorkflowStatus = "queued" | "running" | "waiting_approval" | "completed" | "failed";
type ConnectionState = "connecting" | "connected" | "disconnected";

type WorkflowTelemetry = {
  event: string;
  run_id: string;
  workflow_id: string;
  state: {
    status: WorkflowStatus;
    approval_node?: string | null;
    current_node: string | null;
    completed_nodes: string[];
    error?: string | null;
  };
};

const defaultInitialNodes: Node<ServiceNodeData>[] = [];
const defaultInitialEdges: Edge[] = [];
const defaultLogs: string[] = [];

const starterTemplates = [
  {
    id: "private-review",
    name: "Private review pipeline",
    description: "Prepare a private task, pause for Admin approval, then record a completion event. No external delivery.",
    nodes: [
      { id: "prepare", type: "task" as const, name: "PREPARE PRIVATE DRAFT", detail: "Log-only preparation step", config: { action: "log", message: "Private draft preparation checkpoint" }, depends_on: [] as string[] },
      { id: "approval", type: "approval" as const, name: "ADMIN APPROVAL", detail: "Wait for an explicit Admin decision", config: {}, depends_on: ["prepare"] },
      { id: "complete", type: "notification" as const, name: "RECORD APPROVED", detail: "Internal log-only completion event", config: { channel: "log", message: "Admin approval recorded; no external message sent" }, depends_on: ["approval"] },
    ],
  },
  {
    id: "private-check",
    name: "Private health check",
    description: "Run two internal checkpoints and record completion. No provider calls or external side effects.",
    nodes: [
      { id: "check-input", type: "task" as const, name: "CHECK INPUT", detail: "Internal log-only check", config: { action: "log", message: "Input check completed" }, depends_on: [] as string[] },
      { id: "record-result", type: "task" as const, name: "RECORD RESULT", detail: "Internal log-only result checkpoint", config: { action: "log", message: "Health check result recorded" }, depends_on: ["check-input"] },
      { id: "finish", type: "notification" as const, name: "FINISH", detail: "Internal log-only completion event", config: { channel: "log", message: "Private health check completed" }, depends_on: ["record-result"] },
    ],
  },
];

function nodeClass(status: ServiceNodeData["status"]) {
  return `workflow-node workflow-node-${status}`;
}

function resolveWorkflowSocketUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const base = configured || origin;
  const url = new URL("/api/admin/workflow/ws", base);

  return url.toString().replace(/^http/, "ws");
}

function resolveWorkflowApiUrl(path: string) {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  return new URL(path, configured || origin).toString();
}

export default function AdminWorkflowPage() {
  const socketRef = useRef<WebSocket | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultInitialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultInitialEdges);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("Canvas ready");
  const [inspectingNode, setInspectingNode] = useState<Node<ServiceNodeData> | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [telemetry, setTelemetry] = useState<WorkflowTelemetry | null>(null);
  const [enabledIntegrationIds, setEnabledIntegrationIds] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>(defaultLogs);
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);
  const [workflowId, setWorkflowId] = useState("command-canvas");
  const [transferMessage, setTransferMessage] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const visibleNodes = useMemo(
    () => nodes.filter((node) => !search || node.data.label.toLowerCase().includes(search.toLowerCase())),
    [nodes, search]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<ServiceNodeData>) => {
    setSelected(`${node.data.label} selected`);
    setInspectingNode(node);
  }, []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: "#22D3EE", strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const handleApplyTemplate = useCallback((templateId: string) => {
    const template = starterTemplates.find((item) => item.id === templateId);
    if (!template) return;
    if (nodes.length > 0 && !window.confirm("Replace the current unsaved canvas with this starter template?")) return;
    const nextNodes: Node<ServiceNodeData>[] = template.nodes.map((item, index) => ({
      id: item.id,
      position: { x: 100 + index * 290, y: 150 },
      data: { label: item.name, detail: item.detail, status: "green", nodeType: item.type },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      type: "default",
    }));
    const nextEdges: Edge[] = template.nodes.flatMap((item) => item.depends_on.map((source) => ({ id: "template-" + source + "-" + item.id, source, target: item.id, animated: true, style: { stroke: "#22D3EE", strokeWidth: 2 } })));
    setNodes(nextNodes);
    setEdges(nextEdges);
    setWorkflowId(template.id);
    setTemplateNotice(template.name + " loaded. Review the steps, then save when ready. This template has no external integrations or delivery actions.");
    setSelected(template.name + " loaded");
    setLogs([]);
    setInspectingNode(null);
  }, [nodes.length, setEdges, setNodes]);

  // Add new n8n-style module to canvas
  const handleAddModule = useCallback((module: ServiceModule) => {
    const newId = `${module.id}_${Date.now()}`;
    const newNode: Node<ServiceNodeData> = {
      id: newId,
      position: { x: 200 + Math.random() * 200, y: 150 + Math.random() * 150 },
      data: {
        label: module.canvasLabel,
        detail: module.detail,
        status: "green",
        endpoint: module.endpoint,
        nodeType: module.nodeType ?? "task",
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      type: "default",
    };
    setNodes((prev) => [...prev, newNode]);
    setSelected(`${module.canvasLabel} added to canvas`);
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ADDED ${module.canvasLabel} NODE`, ...prev].slice(0, 6));
  }, [setNodes]);

  const handleDeleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setInspectingNode(null);
  }, [setNodes, setEdges]);

  const handleUpdateNode = useCallback((id: string, data: Partial<ServiceNodeData>) => {
    setNodes((current) => current.map((node) => node.id === id ? { ...node, data: { ...node.data, ...data } } : node));
    setInspectingNode((current) => current?.id === id ? { ...current, data: { ...current.data, ...data } } : current);
  }, [setNodes]);

  const workflowPayload = useCallback(() => ({
    id: workflowId.trim(),
    name: workflowId.trim().replace(/[-_]+/g, " ") || "Untitled workflow",
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.data.nodeType ?? "task",
      name: node.data.label,
      depends_on: edges.filter((edge) => edge.target === node.id).map((edge) => edge.source),
      retry_count: 0,
      timeout_seconds: 30,
      config: {
        detail: node.data.detail,
        ...(node.data.conditionKey?.trim() ? {
          condition: {
            key: node.data.conditionKey.trim(),
            operator: node.data.conditionOperator ?? "equals",
            ...(!["exists", "not_exists"].includes(node.data.conditionOperator ?? "equals") ? { value: node.data.conditionValue ?? "" } : {}),
          },
        } : {}),
      },
    })),
  }), [edges, nodes, workflowId]);

  const authorizedWorkflowRequest = useCallback(async (path: string, init?: RequestInit, allowNotFound = false) => {
    const token = await getAdminSessionToken();
    if (!token) throw new Error("An admin session is required.");
    const response = await fetch(resolveWorkflowApiUrl(path), {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
    });
    if (!response.ok && !(allowNotFound && response.status === 404)) {
      const body = await response.json().catch(() => null);
      throw new Error(typeof body?.detail === "string" ? body.detail : "Workflow action failed.");
    }
    return response;
  }, []);

  const handleSaveWorkflow = useCallback(async () => {
    const payload = workflowPayload();
    if (!payload.id || !/^[A-Za-z0-9_-]+$/.test(payload.id)) {
      setTransferMessage("Workflow ID may use letters, numbers, hyphens, and underscores only.");
      return;
    }
    try {
      await authorizedWorkflowRequest("/api/admin/workflow", { method: "POST", body: JSON.stringify(payload) });
      setTransferMessage("Workflow saved locally. Export is now available.");
    } catch (error) {
      setTransferMessage(error instanceof Error ? error.message : "Unable to save workflow.");
    }
  }, [authorizedWorkflowRequest, workflowPayload]);

  const handleRunWorkflow = useCallback(async () => {
    const payload = workflowPayload();
    if (!payload.id || !/^[A-Za-z0-9_-]+$/.test(payload.id)) {
      setTransferMessage("Workflow ID may use letters, numbers, hyphens, and underscores only.");
      return;
    }

    setIsRunning(true);
    try {
      const existing = await authorizedWorkflowRequest(
        `/api/admin/workflow/${encodeURIComponent(payload.id)}`,
        undefined,
        true,
      );
      if (existing.status === 404) {
        await authorizedWorkflowRequest("/api/admin/workflow", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        const saved = await existing.json() as { name: string; nodes: unknown[] };
        if (saved.name !== payload.name || JSON.stringify(saved.nodes) !== JSON.stringify(payload.nodes)) {
          throw new Error("This workflow ID already contains different content. Save it explicitly first or choose a new ID before running.");
        }
      }
      const response = await authorizedWorkflowRequest(
        `/api/admin/workflow/${encodeURIComponent(payload.id)}/runs`,
        {
          method: "POST",
          body: JSON.stringify({ workflow_id: payload.id, priority: 1, delay_seconds: 0 }),
        },
      );
      const run = await response.json() as Omit<WorkflowTelemetry, "event">;
      setTelemetry({ event: "workflow.status", ...run });
      setTransferMessage(`Run accepted: ${run.run_id}. Canvas tasks execute in log-only mode.`);
      setLogs((previous) => [
        `[${new Date().toLocaleTimeString()}] RUN QUEUED ${run.run_id}`,
        ...previous,
      ].slice(0, 6));
    } catch (error) {
      setTransferMessage(error instanceof Error ? error.message : "Unable to start workflow run.");
    } finally {
      setIsRunning(false);
    }
  }, [authorizedWorkflowRequest, workflowPayload]);

  const handleApprovalDecision = useCallback(async (decision: "approve" | "reject") => {
    if (!telemetry?.run_id || telemetry.state.status !== "waiting_approval") return;
    if (decision === "reject" && !window.confirm("Reject this workflow approval? The run will stop and downstream nodes will not execute.")) return;
    setIsRunning(true);
    try {
      const reason = encodeURIComponent("Rejected by Admin from Workflow command center.");
      const endpoint = `/api/admin/workflow/runs/${encodeURIComponent(telemetry.run_id)}/${decision}${decision === "reject" ? `?reason=${reason}` : ""}`;
      const response = await authorizedWorkflowRequest(endpoint, { method: "POST" });
      const result = await response.json() as { status: string; approved_node?: string; rejected_node?: string };
      setTelemetry((current) => current?.run_id === telemetry.run_id
        ? { ...current, state: { ...current.state, status: decision === "approve" ? "queued" : "failed", approval_node: null, current_node: null, error: decision === "reject" ? result.rejected_node ?? "workflow approval rejected" : null } }
        : current);
      setTransferMessage(decision === "approve"
        ? `Approval recorded for ${result.approved_node ?? telemetry.state.approval_node}. Workflow queued to resume.`
        : `Approval rejected for ${result.rejected_node ?? telemetry.state.approval_node}. Workflow stopped.`);
    } catch (error) {
      setTransferMessage(error instanceof Error ? error.message : `Unable to ${decision} workflow.`);
    } finally {
      setIsRunning(false);
    }
  }, [authorizedWorkflowRequest, telemetry]);

  const handleExportWorkflow = useCallback(async () => {
    try {
      const response = await authorizedWorkflowRequest(`/api/admin/workflow/${encodeURIComponent(workflowId)}/export`);
      const pack = await response.json();
      const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `logixa-workflow-${workflowId}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setTransferMessage("Workflow JSON downloaded. Secrets are excluded from the export.");
    } catch (error) {
      setTransferMessage(error instanceof Error ? error.message : "Save the workflow before exporting it.");
    }
  }, [authorizedWorkflowRequest, workflowId]);

  const handleImportWorkflow = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const pack = JSON.parse(await file.text());
      const response = await authorizedWorkflowRequest("/api/admin/workflow/import", { method: "POST", body: JSON.stringify(pack) });
      const imported = await response.json() as { id: string; nodes: Array<{ id: string; type?: "task" | "approval" | "notification"; name: string; depends_on: string[]; config?: { detail?: string; condition?: { key?: string; operator?: ServiceNodeData["conditionOperator"]; value?: string } } }> };
      setWorkflowId(imported.id);
      setNodes(imported.nodes.map((node, index) => ({
        id: node.id,
        position: { x: 90 + (index % 3) * 280, y: 80 + Math.floor(index / 3) * 170 },
        data: {
          label: node.name,
          detail: node.config?.detail || "Imported workflow node",
          status: "green",
          nodeType: node.type ?? "task",
          conditionKey: node.config?.condition?.key,
          conditionOperator: node.config?.condition?.operator,
          conditionValue: node.config?.condition?.value,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        type: "default",
      })));
      setEdges(imported.nodes.flatMap((node) => node.depends_on.map((source) => ({ id: `import-${source}-${node.id}`, source, target: node.id, animated: true, style: { stroke: "#22D3EE", strokeWidth: 2 } }))));
      setTransferMessage("Workflow imported without overwriting existing definitions.");
    } catch (error) {
      setTransferMessage(error instanceof Error ? error.message : "The selected file is not a valid workflow pack.");
    }
  }, [authorizedWorkflowRequest, setEdges, setNodes]);

  // Execute test call to real backend API endpoints
  const handleExecuteNode = async (node: Node<ServiceNodeData>) => {
    const label = node.data.label;
    if (label === "FLUX BANNER") {
      const res = await fetch("/api/admin/posts/generate-banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Supply Chain Operations Automation", width: 1200, height: 630 }),
      }).catch(() => null);
      return res?.ok ? await res.json() : { status: "simulation_only", simulated: true, model: "FLUX", note: "No banner-generation backend confirmed; no image was generated." };
    }
    if (label === "THOUGHT STREAM") {
      return { status: "demo_only", simulated: true, stream_url: null, note: "This node does not open a live SSE stream." };
    }
    if (label === "TELEGRAM GATE") {
      return { status: "simulation_only", simulated: true, target: "Telegram Admin Topic", actions: [], note: "No Telegram message or callback was dispatched." };
    }
    // Generic fallback
    return { status: "simulation_only", simulated: true, node: label, timestamp: new Date().toISOString(), note: "No real node-specific backend action is wired to this test button." };
  };

  useEffect(() => {
    let cancelled = false;
    void authorizedWorkflowRequest("/api/admin/integrations/catalog")
      .then((response) => response.json() as Promise<{ items?: Array<{ id: string; enabled: boolean }> }>)
      .then((payload) => { if (!cancelled) setEnabledIntegrationIds((payload.items ?? []).filter((item) => item.enabled).map((item) => item.id)); })
      .catch(() => { if (!cancelled) setEnabledIntegrationIds([]); });
    return () => { cancelled = true; };
  }, [authorizedWorkflowRequest]);

  useEffect(() => {
    let cancelled = false;
    async function restorePendingApproval() {
      try {
        const response = await authorizedWorkflowRequest("/api/admin/workflow/approvals/pending");
        const payload = await response.json() as { items?: WorkflowTelemetry[] };
        const pending = payload.items?.[0];
        if (!cancelled && pending) setTelemetry(pending);
      } catch {
        // A socket reconnect can still deliver new workflow telemetry.
      }
    }
    void restorePendingApproval();
    return () => { cancelled = true; };
  }, [authorizedWorkflowRequest]);

  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | undefined;
    async function connect() {
      const token = await getAdminSessionToken();
      if (cancelled) return;
      if (!token) {
        setConnectionState("disconnected");
        return;
      }

      setConnectionState("connecting");
      socket = new WebSocket(resolveWorkflowSocketUrl());
      socketRef.current = socket;

      socket.onopen = () => {
        socket?.send(JSON.stringify({ type: "auth", token }));
        setConnectionState("connecting");
        setLogs((previous) => [`[${new Date().toLocaleTimeString()}] SOCKET AUTHENTICATING`, ...previous].slice(0, 6));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WorkflowTelemetry & { type?: string };
          if (data.type === "auth.ok") {
            setConnectionState("connected");
            setLogs((previous) => [`[${new Date().toLocaleTimeString()}] SOCKET CONNECTED`, ...previous].slice(0, 6));
            return;
          }
          setTelemetry(data);
          setSelected(data.state.current_node ? `${data.state.current_node} active` : `${data.state.status.toUpperCase()} workflow`);
          setLogs((previous) => [
            `[${new Date().toLocaleTimeString()}] ${data.state.status.toUpperCase()} ${data.state.current_node ?? "IDLE"}`,
            ...previous,
          ].slice(0, 6));
        } catch {
          setLogs((previous) => [`[${new Date().toLocaleTimeString()}] INVALID TELEMETRY`, ...previous].slice(0, 6));
        }
      };

      socket.onerror = () => {
        setConnectionState("disconnected");
        setLogs((previous) => [`[${new Date().toLocaleTimeString()}] SOCKET ERROR`, ...previous].slice(0, 6));
      };

      socket.onclose = () => {
        setConnectionState("disconnected");
        setLogs((previous) => [`[${new Date().toLocaleTimeString()}] SOCKET CLOSED`, ...previous].slice(0, 6));
      };
    }
    void connect();

    return () => {
      cancelled = true;
      socket?.close();
      socketRef.current = null;
    };
  }, []);

  const panelStatus = telemetry?.state.status ?? "queued";
  const panelNode = telemetry?.state.current_node ?? null;

  return (
    <main className="workflow-page">
      <WorkflowSidebar
        search={search}
        onSearchChange={setSearch}
        onSelect={(label) => setSelected(`${label} category selected`)}
        onAddNode={handleAddModule}
        enabledIntegrationIds={enabledIntegrationIds}
      />
      <section className="workflow-main">
        <header className="workflow-header">
          <div>
            <span className="workflow-kicker">UNIFIED COMMAND CANVAS</span>
            <h1>Workflow command center</h1>
            <p>Build from a safe starter template or a blank canvas · <strong>{selected}</strong></p>
          </div>
          <div className="workflow-header-status">
            <span className={`status-dot ${connectionState === "connected" ? "status-green" : connectionState === "connecting" ? "status-amber" : "status-red"}`} />
            {connectionState === "connected" ? "TELEMETRY CONNECTED" : connectionState === "connecting" ? "CONNECTING" : "TELEMETRY OFFLINE"}
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/50 p-3 text-xs">
          <label className="text-slate-300">Start from template <select defaultValue="" onChange={(event) => { if (event.target.value) handleApplyTemplate(event.target.value); event.target.value = ""; }} className="ml-2 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-white"><option value="" disabled>Choose a safe starter…</option>{starterTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
          <button type="button" onClick={() => { if (nodes.length && !window.confirm("Clear the current unsaved canvas?")) return; setNodes([]); setEdges([]); setLogs([]); setWorkflowId("untitled-workflow"); setTemplateNotice("Blank canvas ready."); }} className="rounded border border-slate-600 px-3 py-1.5 text-slate-100">Blank canvas</button>
          <label className="text-slate-300">Workflow ID <input value={workflowId} onChange={(event) => setWorkflowId(event.target.value)} className="ml-2 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-white" aria-label="Workflow ID" /></label>
          <button onClick={handleSaveWorkflow} className="rounded border border-cyan-400/50 px-3 py-1.5 text-cyan-200">Save workflow</button>
          <button
            onClick={handleRunWorkflow}
            disabled={isRunning}
            aria-label="Run log-only workflow"
            className="rounded border border-emerald-400/60 px-3 py-1.5 text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRunning ? "Starting run…" : "Run log-only workflow"}
          </button>
          <button onClick={handleExportWorkflow} className="rounded border border-slate-600 px-3 py-1.5 text-slate-100">Export JSON</button>
          <button onClick={() => importInputRef.current?.click()} className="rounded border border-slate-600 px-3 py-1.5 text-slate-100">Import JSON</button>
          <input ref={importInputRef} type="file" accept="application/json,.json" onChange={handleImportWorkflow} className="hidden" />
          <span className="text-slate-400">Runs support internal log and human-approval actions only. Provider execution and external delivery are not wired in this builder yet.</span>
          {transferMessage && <span role="status" className="text-slate-300">{transferMessage}</span>}
          {templateNotice && <span role="status" className="basis-full text-cyan-200">{templateNotice}</span>}
        </div>

        {telemetry?.state.status === "waiting_approval" && (
          <section role="region" aria-label="Pending workflow approval" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/50 bg-amber-950/30 p-4">
            <div>
              <strong className="text-amber-200">Approval required</strong>
              <p className="mt-1 text-xs text-amber-100/80">Run {telemetry.run_id} is paused at node {telemetry.state.approval_node ?? telemetry.state.current_node ?? "approval"}. Downstream nodes are blocked.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={isRunning} onClick={() => void handleApprovalDecision("approve")} className="rounded border border-emerald-400/60 px-3 py-2 text-xs text-emerald-200 disabled:opacity-50">Approve &amp; resume</button>
              <button type="button" disabled={isRunning} onClick={() => void handleApprovalDecision("reject")} className="rounded border border-red-400/60 px-3 py-2 text-xs text-red-200 disabled:opacity-50">Reject &amp; stop</button>
            </div>
          </section>
        )}

        <div className="workflow-canvas-wrap" aria-label="Workflow canvas" style={{ position: "relative" }}>\n          {nodes.length === 0 && <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center p-6 text-center"><div className="max-w-md rounded-xl border border-dashed border-cyan-400/30 bg-slate-950/90 p-6"><p className="text-sm font-semibold text-slate-100">Your workflow canvas is empty</p><p className="mt-2 text-xs leading-5 text-slate-400">Choose a safe starter template above, or add a supported module from the library. Only internal log, metadata and human-approval actions execute in this version.</p></div></div>}
          <ReactFlow
            nodes={visibleNodes.map((node) => ({ ...node, className: nodeClass(node.data.status) }))}
            edges={edges.filter((edge) => visibleNodes.some((node) => node.id === edge.source) && visibleNodes.some((node) => node.id === edge.target))}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            fitView
            nodesDraggable={true}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#1f2a44" gap={24} size={1} />
            <MiniMap nodeColor={(node) => node.data?.status === "red" ? "#EF4444" : node.data?.status === "amber" ? "#F59E0B" : "#10B981"} />
            <Controls />
          </ReactFlow>

          {/* Interactive Node Inspector Drawer */}
          <NodeInspectorDrawer
            selectedNode={inspectingNode}
            onClose={() => setInspectingNode(null)}
            onDeleteNode={handleDeleteNode}
            onExecuteNode={handleExecuteNode}
            onUpdateNode={handleUpdateNode}
          />
        </div>

        <ProcessCostPanel status={panelStatus} currentNode={panelNode} logs={logs} connectionState={connectionState} />
      </section>
    </main>
  );
}
