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

type WorkflowStatus = "queued" | "running" | "waiting_approval" | "completed" | "failed";
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
  const lastRunIdRef = useRef<string | null>(null);
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
      nodes: nodes.map((node) => {
        const isTelegramGate = node.data.label === "TELEGRAM GATE";
        const isThoughtStream = node.data.label === "THOUGHT STREAM";
        const canvas = {
          position: node.position,
          detail: node.data.detail,
          status: node.data.status,
          endpoint: node.data.endpoint ?? null,
        };
        return {
          id: node.id,
          type: isTelegramGate ? "notification" : isThoughtStream ? "agent" : "task",
          name: node.data.label,
          depends_on: incoming.get(node.id) ?? [],
          retry_count: 0,
          timeout_seconds: isThoughtStream ? 180 : 30,
          // Agent execution creates a persisted private Brain draft; it never publishes.
          // Telegram is an external side effect; unsupported nodes remain log-only.
          config: isTelegramGate
            ? {
                channel: "telegram",
                message: "[Logixa Flow] Workflow canvas notification: " + node.data.label + "\n" + node.data.detail,
                canvas,
              }
            : isThoughtStream
              ? {
                  action: "run_agent",
                  message: "Create a Myanmar-ready supply chain insight draft for admin review. Context: " + node.data.detail,
                  max_sources: 8,
                  canvas,
                }
              : {
                  action: "log",
                  message: "Canvas orchestration step: " + node.data.label + " — " + node.data.detail + ". No external service is invoked.",
                  canvas,
                },
        };
      }),
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
      lastRunIdRef.current = run.run_id;
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

  // Poll the authenticated run-state endpoint as a durable fallback to WebSocket telemetry.
  // This keeps the dashboard accurate after reconnects and when terminal events are missed.
  useEffect(() => {
    if (!lastRunId) return;
    let cancelled = false;
    let inFlight = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const pollRunState = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const token = await getAdminSessionToken();
        if (!token || cancelled) return;
        const response = await adminFetch(
          `/api/admin/workflow/runs/${encodeURIComponent(lastRunId)}/state`,
          token
        );
        const state = await response.json() as {
          run_id?: string;
          workflow_id?: string;
          status?: WorkflowStatus;
          current_node?: string | null;
          completed_nodes?: string[];
          error?: string | null;
          execution_history?: string[];
          metrics?: { agent_runs?: Array<{ node_id: string; agent_run_id: number; memory_id: number; status: string }> };
        };
        if (cancelled || state.run_id !== lastRunId || !state.status) return;
        const nextState = {
          status: state.status,
          current_node: state.current_node ?? null,
          completed_nodes: Array.isArray(state.completed_nodes) ? state.completed_nodes : [],
          error: state.error ?? null,
          execution_history: Array.isArray(state.execution_history) ? state.execution_history : [],
          metrics: state.metrics ?? {},
        };
        setTelemetry({
          event: "workflow.status",
          run_id: lastRunId,
          workflow_id: state.workflow_id ?? "admin-command-canvas",
          state: nextState,
        });
        setSelected(nextState.current_node
          ? `${nextState.current_node} active`
          : `${nextState.status.replace("_", " ").toUpperCase()} workflow`);
        setWorkflowNotice(
          nextState.status === "completed"
            ? (() => { const agentRun = nextState.metrics?.agent_runs?.find((item) => item.status === "completed"); return agentRun ? "Workflow run " + lastRunId + " completed. " + nextState.completed_nodes.length + " node(s) completed. Agent run " + agentRun.agent_run_id + " created private draft " + agentRun.memory_id + "; awaiting admin review." : "Workflow run " + lastRunId + " completed. " + nextState.completed_nodes.length + " node(s) completed."; })()
            : nextState.status === "failed"
              ? `Workflow run ${lastRunId} failed: ${nextState.error ?? "No error details returned."}`
              : nextState.status === "waiting_approval"
                ? `Workflow run ${lastRunId} is waiting for approval at ${nextState.current_node ?? "the approval node"}.`
                : `Workflow run ${lastRunId}: ${nextState.status}. ${nextState.completed_nodes.length} node(s) completed so far.`
        );
        if (["completed", "failed"].includes(nextState.status) && intervalId) {
          clearInterval(intervalId);
          intervalId = undefined;
        }
      } catch (error) {
        if (!cancelled) {
          setWorkflowNotice(error instanceof Error
            ? `Could not refresh workflow run status: ${error.message}`
            : "Could not refresh workflow run status.");
        }
      } finally {
        inFlight = false;
      }
    };

    void pollRunState();
    intervalId = setInterval(() => { void pollRunState(); }, 2500);
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [lastRunId]);

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
      const token = await getAdminSessionToken();
      if (!token) throw new Error("Admin session is required to run the content agent.");
      const response = await adminFetch("/api/agent/run", token, {
        method: "POST",
        body: JSON.stringify({
          message: "Create a Myanmar-ready supply chain insight draft for admin review. Context: " + node.data.detail,
          source_ids: [],
        }),
      });
      const result = await response.json() as {
        id?: number;
        status?: string;
        final_memory_id?: number | null;
      };
      if (result.status !== "completed" || !result.final_memory_id) {
        throw new Error("Agent did not confirm a completed run with a persisted private draft.");
      }
      return { status: "completed", agent_run_id: result.id, memory_id: result.final_memory_id, visibility: "private" };
    }
    if (label === "TELEGRAM GATE") {
      const token = await getAdminSessionToken();
      if (!token) throw new Error("Admin session is required to dispatch Telegram messages.");
      const response = await adminFetch("/api/admin/telegram/send", token, {
        method: "POST",
        body: JSON.stringify({
          message: `[Logixa Flow] Workflow canvas test: ${label}\n${node.data.detail}`,
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
          // Once a run is selected, ignore unrelated workflow events so another
          // controller's activity cannot overwrite the status shown for this run.
          if (lastRunIdRef.current && data.run_id !== lastRunIdRef.current) return;
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
