"use client";

import React, { useState } from "react";
import { CheckCircle2, XCircle, ShieldAlert } from "lucide-react";

export interface PendingAgentAction {
  id: string;
  agentId: string;
  agentName: string;
  toolName: string;
  parameters: Record<string, unknown>;
  riskLevel: "low" | "medium" | "high" | "critical";
  description: string;
  createdAt: string;
}

interface AdminActionApprovalModalProps {
  isOpen: boolean;
  action: PendingAgentAction | null;
  onApprove: (actionId: string, comment?: string) => Promise<void>;
  onReject: (actionId: string, reason: string) => Promise<void>;
  onClose: () => void;
}

export function AdminActionApprovalModal({
  isOpen,
  action,
  onApprove,
  onReject,
  onClose,
}: AdminActionApprovalModalProps) {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !action) return null;

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(action.id, comment);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      alert("Please provide a reason for rejecting this agent action.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onReject(action.id, comment);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const riskColors = {
    low: "text-emerald-400 bg-emerald-950/40 border-emerald-800",
    medium: "text-amber-400 bg-amber-950/40 border-amber-800",
    high: "text-orange-400 bg-orange-950/40 border-orange-800",
    critical: "text-rose-400 bg-rose-950/40 border-rose-800",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">Human-in-the-Loop Approval</h3>
            <p className="text-xs text-slate-400">Action requested by {action.agentName}</p>
          </div>
          <span
            className={`ml-auto rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${riskColors[action.riskLevel]}`}
          >
            {action.riskLevel} Risk
          </span>
        </div>

        <div className="my-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-400">Tool / Operation:</label>
            <p className="text-sm font-mono text-cyan-400">{action.toolName}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400">Summary:</label>
            <p className="text-xs text-slate-200">{action.description}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400">Payload Parameters:</label>
            <pre className="max-h-40 overflow-y-auto rounded-md border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-300">
              {JSON.stringify(action.parameters, null, 2)}
            </pre>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400">Operator Feedback / Instructions:</label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Provide comments or reason if rejecting..."
              className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={isSubmitting}
            className="inline-flex items-center rounded-lg border border-rose-900 bg-rose-950/40 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-950 hover:text-rose-300 transition-colors disabled:opacity-50"
          >
            <XCircle className="mr-1.5 h-3.5 w-3.5" />
            Reject Action
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={isSubmitting}
            className="inline-flex items-center rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-500 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Approve & Execute
          </button>
        </div>
      </div>
    </div>
  );
}
