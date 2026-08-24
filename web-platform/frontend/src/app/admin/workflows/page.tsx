"use client";

import React, { useCallback, useEffect, useState } from "react";
import { getAdminSessionToken } from "@/lib/adminSession";
import { adminFetch } from "@/components/api";
import ReactFlow, { Background, Controls, applyEdgeChanges, applyNodeChanges, addEdge, ReactFlowProvider, MiniMap, type Node, type Edge, type NodeChange, type EdgeChange, type Connection } from "reactflow";
import 'reactflow/dist/style.css';

type NodeStatus = "running" | "success" | "failed" | "idle";

export default function AdminWorkflowsPage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = getAdminSessionToken();
    try {
      if (token) {
        const resp = await adminFetch("/api/admin/workflows", token).catch(() => null);
        if (resp) {
          const json = await resp.json().catch(() => null);
          if (json && Array.isArray(json.nodes) && Array.isArray(json.edges)) {
            setNodes(json.nodes);
            setEdges(json.edges);
            setLoading(false);
            return;
          }
        }
      }
      // Fallback to mock data
      const mockNodes = [
        { id: "1", position: { x: 50, y: 50 }, data: { label: "Start", status: "success" }, style: { border: '1px solid #065f46' } },
        { id: "2", position: { x: 300, y: 50 }, data: { label: "Fetch Data", status: "running" }, style: { border: '1px solid #a16207' } },
        { id: "3", position: { x: 550, y: 50 }, data: { label: "Process", status: "idle" }, style: { border: '1px solid #94a3b8' } },
        { id: "4", position: { x: 800, y: 50 }, data: { label: "Publish", status: "failed" }, style: { border: '1px solid #991b1b' } },
      ];
      const mockEdges = [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4' },
      ];
      setNodes(
        mockNodes.map((n) => ({
          ...n,
          data: { ...n.data, label: `${n.data.label}` },
        })),
      );
      setEdges(mockEdges);
    } catch (err) {
      console.error(err);
      setError("Could not load workflows");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), []);

  const runNow = async () => {
    const token = getAdminSessionToken();
    if (!token) {
      setError("Admin session missing");
      return;
    }
    try {
      await adminFetch("/api/admin/workflows/run", token, { method: "POST" }).catch(() => null);
      // refresh view
      loadWorkflows();
    } catch (err) {
      console.error(err);
      setError("Failed to run workflows");
    }
  };

  const nodeColor = (status: NodeStatus) => {
    switch (status) {
      case "running":
        return "#f59e0b"; // yellow
      case "success":
        return "#10b981"; // green
      case "failed":
        return "#ef4444"; // red
      default:
        return "#64748b"; // gray
    }
  };

  const styledNodes = nodes.map((n) => ({
    ...n,
    style: {
      minWidth: 160,
      padding: 10,
      borderRadius: 8,
      background: '#0f172a',
      color: '#fff',
      border: `2px solid ${nodeColor((n.data?.status as NodeStatus) || 'idle')}`,
    },
    data: {
      ...n.data,
      label: (
      <div className="flex items-center gap-3">
        {(n.data?.status === 'running') && <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse shadow-lg shadow-yellow-500/20" />}
        <div>
          <div className="font-bold">{n.data?.label}</div>
          <div className="text-xs text-slate-400 mt-1">{(n.data?.status || 'idle').toString()}</div>
        </div>
      </div>
    ),
    },
  }));

  return (
    <main className="page-shell">
      <section className="agent-header">
        <div>
          <p className="eyebrow">Workflows</p>
          <h1>Workflow Orchestrator</h1>
          <p className="muted">Monitor automation sequences, approvals, and operational handoffs in the admin layer.</p>
        </div>
        <div>
          <button onClick={runNow} className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100">Run Now</button>
        </div>
      </section>

      <div className="admin-panel h-[600px]">
        {loading ? (
          <div className="text-slate-300">Loading workflow graph...</div>
        ) : error ? (
          <div className="text-red-300">{error}</div>
        ) : (
          <ReactFlowProvider>
            <div style={{ width: '100%', height: '100%' }}>
              <ReactFlow nodes={styledNodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView>
                <Background gap={16} />
                <MiniMap maskColor="#1f2937" nodeStrokeColor={(n) => nodeColor((n.data?.status as NodeStatus) || 'idle')} />
                <Controls />
              </ReactFlow>
            </div>
          </ReactFlowProvider>
        )}
      </div>
    </main>
  );
}
