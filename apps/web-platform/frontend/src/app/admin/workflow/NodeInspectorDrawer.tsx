"use client";

import { useState } from "react";
import type { Node } from "@xyflow/react";

export type ServiceNodeData = {
  label: string;
  detail: string;
  status: "green" | "amber" | "red";
  endpoint?: string;
  config?: Record<string, string>;
  conditionKey?: string;
  conditionOperator?: "equals" | "not_equals" | "exists" | "not_exists";
  conditionValue?: string;
};

type NodeInspectorDrawerProps = {
  selectedNode: Node<ServiceNodeData> | null;
  onClose: () => void;
  onDeleteNode?: (id: string) => void;
  onExecuteNode?: (node: Node<ServiceNodeData>) => Promise<unknown>;
  onUpdateNode?: (id: string, data: Partial<ServiceNodeData>) => void;
};

export default function NodeInspectorDrawer({
  selectedNode,
  onClose,
  onDeleteNode,
  onExecuteNode,
  onUpdateNode,
}: NodeInspectorDrawerProps) {
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<string | null>(null);

  if (!selectedNode) return null;

  const data = selectedNode.data;

  const handleTestRun = async () => {
    setExecuting(true);
    setExecutionResult(null);
    try {
      if (onExecuteNode) {
        const res = await onExecuteNode(selectedNode);
        setExecutionResult(JSON.stringify(res, null, 2));
      } else {
        // Default simulated test execution
        await new Promise((r) => setTimeout(r, 600));
        setExecutionResult(
          JSON.stringify(
            {
              status: "simulation_only",
              simulated: true,
              node: data.label,
              timestamp: new Date().toISOString(),
              message: `No backend execution was performed for ${data.label}.`,
            },
            null,
            2
          )
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setExecutionResult(
        JSON.stringify({ status: "error", error: message }, null, 2)
      );
    } finally {
      setExecuting(false);
    }
  };

  return (
    <aside
      className="node-inspector-drawer"
      style={{
        position: "absolute",
        top: "70px",
        right: "30px",
        width: "320px",
        maxHeight: "500px",
        overflowY: "auto",
        background: "rgba(16, 23, 40, 0.95)",
        border: "1px solid rgba(34, 211, 238, 0.4)",
        borderRadius: "10px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
        padding: "16px",
        zIndex: 50,
        backdropFilter: "blur(12px)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #263653", paddingBottom: "8px" }}>
        <div>
          <span className="workflow-kicker" style={{ fontSize: "9px" }}>NODE INSPECTOR</span>
          <h3 style={{ margin: "2px 0 0", color: "#f8fafc", fontSize: "14px" }}>{data.label}</h3>
        </div>
        <button
          onClick={onClose}
          style={{ background: "transparent", border: 0, color: "#94a3b8", cursor: "pointer", fontSize: "16px" }}
        >
          ✕
        </button>
      </div>

      <div style={{ marginTop: "12px", fontSize: "12px", color: "#cbd5e1" }}>
        <p style={{ margin: "0 0 8px", color: "#64748b" }}>{data.detail}</p>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ fontSize: "10px", color: "#94a3b8" }}>Health Status:</span>
          <span
            style={{
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "10px",
              fontWeight: "bold",
              background: data.status === "green" ? "rgba(16, 185, 129, 0.2)" : data.status === "amber" ? "rgba(245, 158, 11, 0.2)" : "rgba(239, 68, 68, 0.2)",
              color: data.status === "green" ? "#10B981" : data.status === "amber" ? "#F59E0B" : "#EF4444",
            }}
          >
            {data.status.toUpperCase()}
          </span>
        </div>

        <fieldset style={{ border: "1px solid #263653", borderRadius: "6px", padding: "8px", margin: "12px 0" }}>
          <legend style={{ padding: "0 4px", fontSize: "10px", color: "#22D3EE" }}>CONDITIONAL BRANCH (LOCAL)</legend>
          <p style={{ margin: "0 0 8px", fontSize: "10px", color: "#94a3b8" }}>Skip this node unless a previous node&apos;s metadata matches. Leave the key blank to always run.</p>
          <input
            aria-label="Condition metadata key"
            value={data.conditionKey ?? ""}
            onChange={(event) => onUpdateNode?.(selectedNode.id, { conditionKey: event.target.value })}
            placeholder="metadata key, e.g. approved"
            style={{ width: "100%", boxSizing: "border-box", marginBottom: "6px", padding: "6px", background: "#0a0f1d", color: "#e2e8f0", border: "1px solid #334155", borderRadius: "4px", fontSize: "11px" }}
          />
          <div style={{ display: "flex", gap: "6px" }}>
            <select
              aria-label="Condition operator"
              value={data.conditionOperator ?? "equals"}
              onChange={(event) => onUpdateNode?.(selectedNode.id, { conditionOperator: event.target.value as ServiceNodeData["conditionOperator"] })}
              style={{ flex: 1, padding: "6px", background: "#0a0f1d", color: "#e2e8f0", border: "1px solid #334155", borderRadius: "4px", fontSize: "11px" }}
            >
              <option value="equals">equals</option>
              <option value="not_equals">not equals</option>
              <option value="exists">exists</option>
              <option value="not_exists">not exists</option>
            </select>
            <input
              aria-label="Condition value"
              value={data.conditionValue ?? ""}
              disabled={["exists", "not_exists"].includes(data.conditionOperator ?? "equals")}
              onChange={(event) => onUpdateNode?.(selectedNode.id, { conditionValue: event.target.value })}
              placeholder="value"
              style={{ flex: 1, padding: "6px", background: "#0a0f1d", color: "#e2e8f0", border: "1px solid #334155", borderRadius: "4px", fontSize: "11px" }}
            />
          </div>
        </fieldset>

        {/* Action Controls */}
        <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
          <button
            type="button"
            onClick={handleTestRun}
            disabled={executing}
            style={{
              flex: 1,
              padding: "8px 12px",
              background: executing ? "#334155" : "linear-gradient(135deg, #06b6d4, #3b82f6)",
              color: "#ffffff",
              border: 0,
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "11px",
              cursor: executing ? "not-allowed" : "pointer",
            }}
          >
            {executing ? "Running..." : "▶️ Test Execute"}
          </button>
          {onDeleteNode && (
            <button
              type="button"
              onClick={() => {
                onDeleteNode(selectedNode.id);
                onClose();
              }}
              style={{
                padding: "8px 10px",
                background: "rgba(239, 68, 68, 0.15)",
                color: "#EF4444",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "6px",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              🗑️
            </button>
          )}
        </div>

        {executionResult && (
          <div style={{ marginTop: "12px" }}>
            <span style={{ fontSize: "10px", color: "#22D3EE", display: "block", marginBottom: "4px" }}>
              EXECUTION OUTPUT:
            </span>
            <pre
              style={{
                background: "#0a0f1d",
                padding: "8px",
                borderRadius: "4px",
                fontSize: "10px",
                color: "#38bdf8",
                overflowX: "auto",
                border: "1px solid rgba(56, 189, 248, 0.2)",
                maxHeight: "150px",
              }}
            >
              {executionResult}
            </pre>
          </div>
        )}
      </div>
    </aside>
  );
}
