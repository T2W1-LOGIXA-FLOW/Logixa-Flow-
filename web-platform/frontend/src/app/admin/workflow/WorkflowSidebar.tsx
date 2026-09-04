"use client";

type WorkflowSidebarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (label: string) => void;
};

const categories = ["Research", "Media", "Finance", "Outbound"];

export default function WorkflowSidebar({ search, onSearchChange, onSelect }: WorkflowSidebarProps) {
  return (
    <aside className="workflow-sidebar" aria-label="Workflow services">
      <div className="workflow-sidebar-heading">
        <span className="workflow-kicker">COMMAND LIBRARY</span>
        <h2>Service modules</h2>
      </div>
      <label className="workflow-search">
        <span className="sr-only">Search services</span>
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search services..." />
      </label>
      <div className="workflow-sidebar-groups">
        {categories.map((category) => (
          <button key={category} type="button" className="workflow-category" onClick={() => onSelect(category)}>
            <span>{category}</span><span className="workflow-tag">{category === "Research" ? "CORE" : "OPS"}</span>
          </button>
        ))}
      </div>
      <p className="workflow-sidebar-hint">Drag-ready visual modules</p>
    </aside>
  );
}
