"use client";

import { useCallback, useMemo, useState } from "react";
import { Background, Controls, MiniMap, ReactFlow, type Edge, type Node, Position } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import ProcessCostPanel from "./ProcessCostPanel";
import WorkflowSidebar from "./WorkflowSidebar";
import "./page.css";

type ServiceNodeData = { label: string; detail: string; status: "green" | "amber" | "red" };

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

function nodeClass(status: ServiceNodeData["status"]) {
  return `workflow-node workflow-node-${status}`;
}

export default function AdminWorkflowPage() {
  const nodes = initialNodes;
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("Canvas ready");
  const visibleNodes = useMemo(() => nodes.filter((node) => !search || node.data.label.toLowerCase().includes(search.toLowerCase())), [nodes, search]);
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<ServiceNodeData>) => setSelected(`${node.data.label} selected`), []);

  return (
    <main className="workflow-page">
      <WorkflowSidebar search={search} onSearchChange={setSearch} onSelect={(label) => setSelected(`${label} category selected`)} />
      <section className="workflow-main">
        <header className="workflow-header">
          <div><span className="workflow-kicker">UNIFIED COMMAND CANVAS</span><h1>Workflow command center</h1><p>Visual orchestration overview · <strong>{selected}</strong></p></div>
          <div className="workflow-header-status"><span className="status-dot status-green" /> SYSTEM NOMINAL</div>
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
        <ProcessCostPanel />
      </section>
    </main>
  );
}
