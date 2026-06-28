"use client";

import { AgentStep } from "./api";

import Skeleton from "./shadcn/Skeleton";

export default function AgentThinkingPanel({ steps }: { steps: AgentStep[] }) {
  if (!steps.length) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Skeleton className="h-6 w-6 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Skeleton className="h-6 w-6 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Skeleton className="h-6 w-6 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-timeline" aria-label="Agent reasoning timeline">
      {steps.map((step) => (
        <article className="agent-step-card" key={step.id || `${step.agent}-${step.step_order}`}>
          <span>{String(step.step_order).padStart(2, "0")}</span>
          <div>
            <strong>{step.agent}</strong>
            <p>{step.message}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
