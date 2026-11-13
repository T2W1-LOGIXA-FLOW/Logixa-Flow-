"use client";

import { useMemo, useState } from "react";
import { Plus, Search, ShieldCheck, Workflow } from "lucide-react";

export type ServiceModule = {
  id: string;
  name: string;
  canvasLabel: string;
  detail: string;
  category: "Core" | "Approval" | "Integrations";
  tag: string;
  endpoint?: string;
  nodeType?: "task" | "approval" | "notification";
  integrationId?: string;
  supported: boolean;
};

export const AVAILABLE_MODULES: ServiceModule[] = [
  { id: "log_task", name: "Internal task", canvasLabel: "INTERNAL TASK", detail: "Write a private execution checkpoint to workflow logs", category: "Core", tag: "LOG", nodeType: "task", supported: true },
  { id: "approval_gate", name: "Human approval", canvasLabel: "ADMIN APPROVAL", detail: "Pause until an Admin explicitly approves or rejects", category: "Approval", tag: "HUMAN", nodeType: "approval", supported: true },
  { id: "log_event", name: "Log completion", canvasLabel: "LOG EVENT", detail: "Record an internal completion event; no external message", category: "Core", tag: "LOG", nodeType: "notification", supported: true },
  { id: "telegram_gate", name: "Telegram delivery", canvasLabel: "TELEGRAM", detail: "Provider adapter is not implemented; preview only", category: "Integrations", tag: "NOT READY", integrationId: "telegram", supported: false },
  { id: "email_delivery", name: "Email delivery", canvasLabel: "EMAIL", detail: "Provider adapter is not implemented; preview only", category: "Integrations", tag: "NOT READY", supported: false },
];

type WorkflowSidebarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (label: string) => void;
  onAddNode?: (module: ServiceModule) => void;
  enabledIntegrationIds?: string[];
};

const categories = ["All actions", "Core", "Approval", "Integrations"] as const;

export default function WorkflowSidebar({ search, onSearchChange, onSelect, onAddNode, enabledIntegrationIds = [] }: WorkflowSidebarProps) {
  const [category, setCategory] = useState<(typeof categories)[number]>("All actions");
  const filteredModules = useMemo(() => AVAILABLE_MODULES.filter((module) => {
    const matchesCategory = category === "All actions" || module.category === category;
    const matchesSearch = !search || [module.name, module.detail, module.category].some((value) => value.toLowerCase().includes(search.toLowerCase()));
    const integrationAvailable = !module.integrationId || enabledIntegrationIds.includes(module.integrationId);
    return matchesCategory && matchesSearch && integrationAvailable;
  }), [category, search, enabledIntegrationIds]);

  return (
    <aside className="workflow-sidebar" aria-label="Workflow action library">
      <div className="workflow-sidebar-heading">
        <span className="workflow-kicker">NODE LIBRARY</span>
        <h2>Build workflow</h2>
        <p>Choose an action to add it to the canvas.</p>
      </div>
      <label className="workflow-search">
        <Search size={14} aria-hidden="true" />
        <span className="sr-only">Search actions</span>
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search actions…" />
      </label>
      <div className="workflow-category-tabs" role="tablist" aria-label="Action categories">
        {categories.map((item) => (
          <button key={item} type="button" role="tab" aria-selected={category === item} className={category === item ? "workflow-category is-active" : "workflow-category"} onClick={() => { setCategory(item); onSelect(item); }}>
            {item}
          </button>
        ))}
      </div>
      <div className="workflow-module-list">
        <div className="workflow-library-count"><Workflow size={13} aria-hidden="true" /> {filteredModules.length} actions</div>
        {filteredModules.map((module) => (
          <article key={module.id} className={module.supported ? "workflow-module-card" : "workflow-module-card is-unavailable"}>
            <div className="workflow-module-copy">
              <div className="workflow-module-title">{module.name}</div>
              <p>{module.detail}</p>
              <span className={module.supported ? "workflow-module-tag" : "workflow-module-tag is-muted"}>{module.supported ? module.tag : "COMING SOON"}</span>
            </div>
            {module.supported ? (
              <button type="button" className="workflow-add-node" onClick={() => onAddNode?.(module)} aria-label={"Add " + module.name}><Plus size={16} /> Add</button>
            ) : (
              <span className="workflow-unavailable-label" title="This action is not executable yet"><ShieldCheck size={14} /> Not ready</span>
            )}
          </article>
        ))}
        {filteredModules.length === 0 && <p className="workflow-library-empty">No actions match this filter.</p>}
      </div>
      <div className="workflow-sidebar-hint"><strong>Supported now</strong><br />Internal log steps and durable Admin approval. Provider delivery remains disabled until its adapter is implemented.</div>
    </aside>
  );
}
