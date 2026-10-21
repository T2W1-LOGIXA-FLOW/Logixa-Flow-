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
import { adminFetch } from "@/components/api";
import ProcessCostPanel from "./ProcessCostPanel";
import WorkflowSidebar, { type ServiceModule } from "./WorkflowSidebar";
import NodeInspectorDrawer, { type ServiceNodeData } from "./NodeInspectorDrawer";
import "./page.css";

type WorkflowStatus = "queued" | "running" | "completed" | "failed";
type ConnectionState = "connecting" | "connected" | "disconnected";

type WorkflowTelemetry = {
  event: string;
  run_id: string;
  workflow_id: string;
  state: {
    status: WorkflowStatus;
    current_node: string | null;
    completed_nodes: string[];
    error?: string | null;
  };
};

const defaultInitialNodes: Node<ServiceNodeData>[] = [
  { id: "research", position: { x: 80, y: 80 }, data: { label: "RESEARCH", detail: "Intelligence intake", status: "green" }, sourcePosition: Position.Right, targetPosition: Position.Left, type: "default" },
  { id: "media", position: { x: 350, y: 80 }, data: { label: "MEDIA", detail: "Content processing", status: "amber" }, sourcePosition: Position.Right, targetPosition: Position.Left, type: "default" },
  { id: "finance", position: { x: 620, y: 80 }, data: { label: "FINANCE", detail: "Cost controls", status: "green" }, sourcePosition: Position.Bottom, targetPosition: Position.Left, type: "default" },
  { id: "outbound", position: { x: 350, y: 280 }, data: { label: "OUTBOUND", detail: "Delivery gateway", status: "red" }, sourcePosition: Position.Right, targetPosition: Position.Top, type: "default" },
  { id: "orchestrator", position: { x: 80, y: 280 }, data: { label: "ORCHESTRATOR", detail: "Command routing", status: "green" }, sourcePosition: Position.Right, targetPosition: Position.Left, type: "default" },
];

const defaultInitialEdges: Edge[] = [
  { id: "e1", source: "orchestrator", target: "research", animated: true, style: { stroke: "#22D3EE", strokeWidth: 2 } },
  { id: "e2", source: "research", target: "media", animated: true, style: { stroke: "#8B5CF6", strokeWidth: 2 } },
  { id: "e3", source: "media", target: "finance", animated: true, style: { stroke: "#22D3EE", strokeWidth: 2 } },
  { id: "e4", source: "finance", target: "outbound", animated: true, style: { stroke: "#8B5CF6", strokeWidth: 2 } },
];

const defaultLogs = [
  "[20:47:12] ROUTER  OK",
  "[20:47:09] INDEXER READY",
  "[20:46:51] MEDIA WAIT",
  "[20:45:20] OUTBOUND RETRY",
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

export default function AdminWorkflowPage() {
  const socketRef = useRef<WebSocket | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultInitialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultInitialEdges);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("Canvas ready");
  const [inspectingNode, setInspectingNode] = useState<Node<ServiceNodeData> | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [telemetry, setTelemetry] = useState<WorkflowTelemetry | null>(null);
  const [logs, setLogs] = useState<string[]>(defaultLogs);
  const [workflowBusy, setWorkflowBusy] = useState<"idle" | "saving" | "running">("idle");
  const [workflowNotice, setWorkflowNotice] = useState<string | null>(null);
  const [lastRunId, setLastRunId] = useState<string | null>(null);

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

  const saveCanvasWorkflow = useCallback(async (token: string) => {
    const incoming = new Map<string, string[]>();
    for (const node of nodes) incoming.set(node.id, []);
    for (const edge of edges) {
      if (incoming.has(edge.target) && incoming.has(edge.source)) {
        incoming.get(edge.target)?.push(edge.source);
      }
    }
    const payload = {
      id: "admin-command-canvas",
      name: "Admin Command Canvas",
      nodes: nodes.map((node) => ({
        id: node.id,
        type: "task",
        name: node.data.label,
        depends_on: incoming.get(node.id) ?? [],
        retry_count: 0,
        timeout_seconds: 30,
        // Canvas nodes currently execute as explicit log-only orchestration steps.
        // Persist visual metadata without pretending that a service integration ran.
        config: {
          action: "log",
          message: `Canvas orchestration step: ${node.data.label} — ${node.data.detail}. No external service is invoked.`,
          canvas: {
            position: node.position,
            detail: node.data.detail,
            status: node.data.status,
            endpoint: node.data.endpoint ?? null,
          },
        },
      })),
    };
    await adminFetch("/api/admin/workflow", token, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }, [nodes, edges]);

  const handleSaveWorkflow = useCallback(async () => {
    setWorkflowBusy("saving");
    setWorkflowNotice(null);
    try {
      const token = await getAdminSessionToken();
      if (!token) throw new Error("Admin session is required to save this workflow.");
      await saveCanvasWorkflow(token);
      setWorkflowNotice("Workflow saved to the backend database.");
    } catch (error) {
      setWorkflowNotice(error instanceof Error ? error.message : "Workflow save failed.");
    } finally {
      setWorkflowBusy("idle");
    }
  }, [saveCanvasWorkflow]);

  const handleRunWorkflow = useCallback(async () => {
    setWorkflowBusy("running");
    setWorkflowNotice(null);
    setLastRunId(null);
    try {
      const token = await getAdminSessionToken();
      if (!token) throw new Error("Admin session is required to run this workflow.");
      await saveCanvasWorkflow(token);
      const response = await adminFetch("/api/admin/workflow/admin-command-canvas/runs", token, {
        method: "POST",
        body: JSON.stringify({ workflow_id: "admin-command-canvas" }),
      });
      const run = await response.json() as { run_id?: string; state?: { status?: string } };
      if (!run.run_id) throw new Error("Backend accepted no identifiable workflow run.");
      setLastRunId(run.run_id);
      setWorkflowNotice(`Orchestration run queued (${run.state?.status ?? "queued"}). This executes log-only canvas steps; external service integrations are not invoked.`);
      setSelected("Orchestration run queued");
    } catch (error) {
      setWorkflowNotice(error instanceof Error ? error.message : "Workflow run could not be queued.");
    } finally {
      setWorkflowBusy("idle");
    }
  }, [saveCanvasWorkflow]);

  useEffect(() => {
    let cancelled = false;
    async function restoreCanvas() {
      try {
        const token = await getAdminSessionToken();
        if (!token || cancelled) return;
        const response = await adminFetch("/api/admin/workflow/admin-command-canvas", token);
        const saved = await response.json() as {
          nodes?: Array<{ id: string; name: string; depends_on?: string[]; config?: { canvas?: { position?: { x: number; y: number }; detail?: string; status?: ServiceNodeData["status"]; endpoint?: string | null } } }>;
        };
        if (cancelled || !Array.isArray(saved.nodes) || saved.nodes.length === 0) return;
        const restoredNodes: Node<ServiceNodeData>[] = saved.nodes.map((item, index) => ({
          id: item.id,
          position: item.config?.canvas?.position ?? { x: 80 + (index % 3) * 270, y: 80 + Math.floor(index / 3) * 200 },
          data: {
            label: item.name,
            detail: item.config?.canvas?.detail ?? item.name,
            status: item.config?.canvas?.status ?? "green",
            ...(item.config?.canvas?.endpoint ? { endpoint: item.config.canvas.endpoint } : {}),
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          type: "default",
        }));
        const restoredEdges: Edge[] = [];
        for (const item of saved.nodes) {
          for (const dependency of item.depends_on ?? []) {
            if (saved.nodes.some((candidate) => candidate.id === dependency)) {
              restoredEdges.push({
                id: `saved-${dependency}-${item.id}`,
                source: dependency,
                target: item.id,
                animated: true,
                style: { stroke: "#22D3EE", strokeWidth: 2 },
              });
            }
          }
        }
        setNodes(restoredNodes);
        setEdges(restoredEdges);
        setSelected("Saved workflow restored");
        setWorkflowNotice("Loaded the saved workflow from the backend database.");
      } catch {
        // A missing saved definition is expected on first use; keep the editable defaults.
      }
    }
    void restoreCanvas();
    return () => { cancelled = true; };
  }, [setNodes, setEdges]);

  // Execute test call to real backend API endpoints
  const handleExecuteNode = async (node: Node<ServiceNodeData>) => {
    const label = node.data.label;
    if (label === "FLUX BANNER") {
      const token = await getAdminSessionToken();
      if (!token) throw new Error("Admin session is required to generate a banner.");
      const res = await adminFetch("/api/admin/posts/generate-banner", token, {
        method: "POST",
        body: JSON.stringify({ prompt: "Supply Chain Operations Automation", width: 1200, height: 630 }),
      });
      return await res.json();
    }
    if (label === "THOUGHT STREAM") {
      throw new Error("THOUGHT STREAM has no authenticated streaming adapter configured. No stream was started.");
    }
    if (label === "TELEGRAM GATE") {
      const token = await getAdminSessionToken();
      if (!token) throw new Error("Admin session is required to dispatch Telegram messages.");
      const response = await adminFetch("/api/admin/telegram/send", token, {
        method: "POST",
        body: JSON.stringify({
          message: `[Logixa Flow] Workflow canvas test: ${label}\\n${node.data.detail}`,
        }),
      });
      const result = await response.json() as { delivered?: boolean; message_id?: number };
      if (result.delivered !== true) throw new Error("Telegram API did not confirm message delivery.");
      return { status: "delivered", message_id: result.message_id };
    }
    // Do not report success for modules that have no real execution adapter.
    // A simulated result can be mistaken for a production workflow run.
    throw new Error(`No real execution adapter is configured for "${label}". This node was not executed.`);
  };

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
      />
      <section className="workflow-main">
        <header className="workflow-header">
          <div>
            <span className="workflow-kicker">UNIFIED COMMAND CANVAS</span>
            <h1>Workflow command center</h1>
            <p>Visual orchestration overview · <strong>{selected}</strong></p>
          </div>
          <div className="workflow-header-status">
            <span className={`status-dot ${connectionState === "connected" ? "status-green" : connectionState === "connecting" ? "status-amber" : "status-red"}`} />
            {connectionState === "connected" ? "SYSTEM LIVE" : connectionState === "connecting" ? "SYNCING" : "OFFLINE"}
          </div>
          <div className="workflow-actions">
            <button type="button" onClick={handleSaveWorkflow} disabled={workflowBusy !== "idle"}>
              {workflowBusy === "saving" ? "Saving…" : "Save workflow"}
            </button>
            <button type="button" onClick={handleRunWorkflow} disabled={workflowBusy !== "idle"}>
              {workflowBusy === "running" ? "Queueing…" : "Run orchestration test"}
            </button>
          </div>
          {workflowNotice && <p role="status" className="workflow-notice">{workflowNotice}</p>}
          {lastRunId && <p className="workflow-run-id">Run ID: {lastRunId}</p>}
        </header>

        <div className="workflow-canvas-wrap" aria-label="Workflow canvas" style={{ position: "relative" }}>
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
          />
        </div>

        <ProcessCostPanel status={panelStatus} currentNode={panelNode} logs={logs} connectionState={connectionState} />
      </section>
    </main>
  );
}
