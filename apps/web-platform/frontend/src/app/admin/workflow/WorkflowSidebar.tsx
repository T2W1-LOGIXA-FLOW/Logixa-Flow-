"use client";

export type ServiceModule = {
  id: string;
  name: string;
  canvasLabel: string;
  detail: string;
  category: "Research" | "Media" | "Finance" | "Outbound";
  tag: string;
  endpoint?: string;
};

export const AVAILABLE_MODULES: ServiceModule[] = [
  { id: "thought_stream", name: "Live Thought Stream", canvasLabel: "THOUGHT STREAM", detail: "Real-time agent cognition trace", category: "Research", tag: "AGENT", endpoint: "/api/agent/run" },
  { id: "concept_map", name: "Mermaid Mindmap Engine", canvasLabel: "CONCEPT MAP", detail: "Knowledge relation diagram", category: "Research", tag: "GRAPH", endpoint: "/api/admin/workflow/concept-map" },
  { id: "flux_banner", name: "FLUX AI Banner Generator", canvasLabel: "FLUX BANNER", detail: "Pollinations 1200x630 banner", category: "Media", tag: "FLUX", endpoint: "/api/admin/posts/generate-banner" },
  { id: "edge_tts", name: "Edge Neural Voiceover", canvasLabel: "VOICEOVER", detail: "Burmese/English synthetic audio", category: "Media", tag: "AUDIO", endpoint: "/api/v1/episodes/voiceover" },
  { id: "receipt_extract", name: "Smart Receipt Parser", canvasLabel: "RECEIPT PARSER", detail: "Zero-cost tax/vendor extractor", category: "Finance", tag: "OCR", endpoint: "/api/documents/extract-receipt" },
  { id: "telegram_gate", name: "Telegram Approval Gate", canvasLabel: "TELEGRAM GATE", detail: "Human-in-the-loop callback bot", category: "Outbound", tag: "BOT", endpoint: "/api/telegram/action" },
];

type WorkflowSidebarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (label: string) => void;
  onAddNode?: (module: ServiceModule) => void;
};

const categories = ["Research", "Media", "Finance", "Outbound"];

export default function WorkflowSidebar({
  search,
  onSearchChange,
  onSelect,
  onAddNode,
}: WorkflowSidebarProps) {
  const filteredModules = AVAILABLE_MODULES.filter(
    (m) =>
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.detail.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="workflow-sidebar" aria-label="Workflow services">
      <div className="workflow-sidebar-heading">
        <span className="workflow-kicker">COMMAND LIBRARY</span>
        <h2>Service modules</h2>
      </div>
      <label className="workflow-search">
        <span className="sr-only">Search services</span>
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search services..."
        />
      </label>

      {/* Category quick selectors */}
      <div className="workflow-sidebar-groups">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className="workflow-category"
            onClick={() => onSelect(category)}
          >
            <span>{category}</span>
            <span className="workflow-tag">{category === "Research" ? "CORE" : "OPS"}</span>
          </button>
        ))}
      </div>

      {/* N8N-style action modules */}
      <div className="workflow-module-list" style={{ marginTop: "24px" }}>
        <span className="workflow-kicker" style={{ fontSize: "9px" }}>ADD NODE TO PIPELINE</span>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
          {filteredModules.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                background: "rgba(10, 15, 30, 0.7)",
                border: "1px solid rgba(34, 211, 238, 0.15)",
                borderRadius: "6px",
                fontSize: "11px",
              }}
            >
              <div>
                <span style={{ color: "#f8fafc", display: "block", fontWeight: 600 }}>{m.name}</span>
                <span style={{ color: "#64748b", fontSize: "10px" }}>{m.detail}</span>
              </div>
              <button
                type="button"
                onClick={() => onAddNode?.(m)}
                title={`Add ${m.name} to canvas`}
                style={{
                  background: "rgba(34, 211, 238, 0.15)",
                  color: "#22D3EE",
                  border: "1px solid rgba(34, 211, 238, 0.4)",
                  borderRadius: "4px",
                  padding: "3px 7px",
                  fontSize: "10px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                + Add
              </button>
            </div>
          ))}
        </div>
      </div>

      <p className="workflow-sidebar-hint">Drag-ready visual modules</p>
    </aside>
  );
}
