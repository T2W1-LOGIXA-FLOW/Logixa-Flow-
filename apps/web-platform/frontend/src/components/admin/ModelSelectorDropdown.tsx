"use client";

import React, { useState } from "react";
import { Cpu, ChevronDown, Check, Zap, Sparkles, Brain } from "lucide-react";

export type AIModelOption = {
  id: string;
  name: string;
  provider: string;
  speed: string;
  description: string;
  icon: string;
};

export const AI_MODELS: AIModelOption[] = [
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google DeepMind",
    speed: "0.8s",
    description: "Deep Multimodal Reasoning & System Thinking",
    icon: "Brain",
  },
  {
    id: "groq-llama-3.3",
    name: "Groq Llama 3.3 70B",
    provider: "Groq LPUs",
    speed: "0.18s",
    description: "Ultra-Fast Realtime Streaming Inference",
    icon: "Zap",
  },
  {
    id: "deepseek-r1",
    name: "DeepSeek-R1 Distill",
    provider: "DeepSeek AI",
    speed: "1.2s",
    description: "Autonomous Chain-of-Thought & Math Logic",
    icon: "Sparkles",
  },
];

export function ModelSelectorDropdown() {
  const [selectedId, setSelectedId] = useState("gemini-2.5-pro");
  const [isOpen, setIsOpen] = useState(false);

  const activeModel = AI_MODELS.find((m) => m.id === selectedId) || AI_MODELS[0];

  return (
    <div className="relative select-none">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-lg shadow-cyan-950/20 hover:border-cyan-400 hover:bg-slate-800/80 transition-all"
      >
        <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-white">{activeModel.name}</span>
        <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300">
          {activeModel.speed}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-white/10 bg-[#0d1527] p-2 shadow-2xl backdrop-blur-2xl z-50">
            <div className="px-3 py-2 border-b border-white/[0.08] mb-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                ACTIVE AI INFERENCE ROUTE
              </span>
            </div>

            <div className="space-y-1">
              {AI_MODELS.map((model) => {
                const isCurrent = model.id === selectedId;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(model.id);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-start justify-between rounded-xl p-2.5 text-left transition-all ${
                      isCurrent
                        ? "bg-cyan-500/10 border border-cyan-500/30 text-white"
                        : "hover:bg-white/[0.05] border border-transparent text-slate-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{model.name}</span>
                        <span className="text-[9px] font-mono text-cyan-400">({model.speed})</span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-400 line-clamp-1">{model.description}</p>
                    </div>

                    {isCurrent && <Check className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ModelSelectorDropdown;
