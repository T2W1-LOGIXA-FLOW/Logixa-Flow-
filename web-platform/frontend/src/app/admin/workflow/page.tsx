"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Background, Controls, MiniMap, ReactFlow, type Edge, type Node, Position } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { getAdminSessionToken } from "@/lib/adminSession";
import ProcessCostPanel from "./ProcessCostPanel";
import WorkflowSidebar from "./WorkflowSidebar";
import "./page.css";

type ServiceNodeData = { label: string; detail: string; status: "green" | "amber" | "red" };
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

const initialNodes: Node<ServiceNodeData>[] = [
  { id: "research", position: { x: 80, y: 80 }, data: { label: "RESEARCH", detail: "Intelligence intake", status: "green" }, sourcePosition: Position.Right, targetPosition: Position.Left, type: "default" },
  { id: "media", position: { x: 350, y: 80 }, data: { label: "MEDIA", detail: "Content processing", status: "amber" }, sourcePosition: Position.Right, targetPosition: Position.Left, type: "default" },
  { id: "finance", position: { x: 620, y: 80 }, data: { label: "FINANCE", detail: "Cost controls", status: "green" }, sourcePosition: Position.Bottom, targetPosition: Position.Left, type: "default" },
  { id: "outbound", position: { x: 350, y: 280 }, data: { label: "OUTBOUND", detail: "Delivery gateway", status: "red" }, sourcePosition: Position.Right, targetPosition: Position.Top, type: "default" },
  { id: "orchestrator", position: { x: 80, y: 280 }, data: { label: "ORCHESTRATOR", detail: "Command routing", status: "green" }, sourcePosition: Position.Right, targetPosition: Position.Left, type: "default" },
];

const initialEdges: Edge[] = [
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
  const nodes = initialNodes;
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("Canvas ready");
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [telemetry, setTelemetry] = useState<WorkflowTelemetry | null>(null);
  const [logs, setLogs] = useState<string[]>(defaultLogs);
  const visibleNodes = useMemo(() => nodes.filter((node) => !search || node.data.label.toLowerCase().includes(search.toLowerCase())), [nodes, search]);
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<ServiceNodeData>) => setSelected(`${node.data.label} selected`), []);

  useEffect(() => {
    const token = getAdminSessionToken();
    if (!token) {
      setConnectionState("disconnected");
      return;
    }

    setConnectionState("connecting");
    const socket = new WebSocket(resolveWorkflowSocketUrl());
    socketRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "auth", token }));
      setConnectionState("connected");
      setLogs((previous) => [`[${new Date().toLocaleTimeString()}] SOCKET CONNECTED`, ...previous].slice(0, 6));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WorkflowTelemetry;
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

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, []);

  const panelStatus = telemetry?.state.status ?? "queued";
  const panelNode = telemetry?.state.current_node ?? null;

  return (
    <main className="workflow-page">
      <WorkflowSidebar search={search} onSearchChange={setSearch} onSelect={(label) => setSelected(`${label} category selected`)} />
      <section className="workflow-main">
        <header className="workflow-header">
          <div><span className="workflow-kicker">UNIFIED COMMAND CANVAS</span><h1>Workflow command center</h1><p>Visual orchestration overview · <strong>{selected}</strong></p></div>
          <div className="workflow-header-status"><span className={`status-dot ${connectionState === "connected" ? "status-green" : connectionState === "connecting" ? "status-amber" : "status-red"}`} /> {connectionState === "connected" ? "SYSTEM LIVE" : connectionState === "connecting" ? "SYNCING" : "OFFLINE"}</div>
        </header>
        <div className="workflow-canvas-wrap" aria-label="Workflow canvas">
          <ReactFlow
            nodes={visibleNodes.map((node) => ({ ...node, className: nodeClass(node.data.status) }))}
            edges={initialEdges.filter((edge) => visibleNodes.some((node) => node.id === edge.source) && visibleNodes.some((node) => node.id === edge.target))}
            onNodeClick={onNodeClick}
            fitView
            nodesDraggable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#1f2a44" gap={24} size={1} />
            <MiniMap nodeColor={(node) => node.data?.status === "red" ? "#EF4444" : node.data?.status === "amber" ? "#F59E0B" : "#10B981"} />
            <Controls />
          </ReactFlow>
        </div>
        <ProcessCostPanel status={panelStatus} currentNode={panelNode} logs={logs} connectionState={connectionState} />
      </section>
    </main>
  );
}
