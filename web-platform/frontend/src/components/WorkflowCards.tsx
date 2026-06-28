"use client";

import React from "react";

export interface WorkflowState {
  id: string;
  label: string;
  icon: string;
  description: string;
  count?: number;
  color: "slate" | "blue" | "cyan" | "orange" | "green";
}

interface WorkflowCardsProps {
  states: WorkflowState[];
  onStateClick?: (stateId: string) => void;
}

export default function WorkflowCards({ states, onStateClick }: WorkflowCardsProps) {
  const colorMap = {
    slate: "bg-slate-800/40 border-slate-700/50 text-slate-300",
    blue: "bg-blue-900/40 border-blue-700/50 text-blue-300",
    cyan: "bg-cyan-900/40 border-cyan-700/50 text-cyan-300",
    orange: "bg-orange-900/40 border-orange-700/50 text-orange-300",
    green: "bg-green-900/40 border-green-700/50 text-green-300",
  };

  const accentMap = {
    slate: "from-slate-500/20 to-transparent",
    blue: "from-blue-500/20 to-transparent",
    cyan: "from-cyan-500/20 to-transparent",
    orange: "from-orange-500/20 to-transparent",
    green: "from-green-500/20 to-transparent",
  };

  return (
    <div className="workflow-cards-grid">
      {states.map((state, index) => (
        <div
          key={state.id}
          className={`workflow-state-card ${colorMap[state.color]} cursor-pointer transition-all hover:shadow-lg hover:shadow-${state.color}-500/20 backdrop-blur border rounded-lg p-6 relative overflow-hidden group`}
          onClick={() => onStateClick?.(state.id)}
        >
          {/* Gradient accent background */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${accentMap[state.color]} pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity`}
          />

          {/* Card content */}
          <div className="relative z-10">
            {/* Step indicator */}
            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-900/50 border border-slate-700/50">
                <span className="text-sm font-semibold text-slate-300">{String(index + 1).padStart(2, "0")}</span>
              </div>
              {states.length > 1 && index < states.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 bg-gradient-to-r from-slate-700/50 to-transparent" />
              )}
            </div>

            {/* Icon */}
            <div className="text-3xl mb-3">{state.icon}</div>

            {/* Label */}
            <h3 className="text-lg font-semibold mb-1 text-white">{state.label}</h3>

            {/* Description */}
            <p className="text-sm text-slate-400 mb-4 line-clamp-2">{state.description}</p>

            {/* Count badge if present */}
            {state.count !== undefined && (
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium bg-slate-900/60 border border-slate-700/50 text-slate-300`}>
                {state.count} item{state.count !== 1 ? "s" : ""}
              </div>
            )}
          </div>

          {/* Bottom accent line */}
          <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-${state.color}-500/50 via-${state.color}-500/25 to-transparent`} />
        </div>
      ))}
    </div>
  );
}
