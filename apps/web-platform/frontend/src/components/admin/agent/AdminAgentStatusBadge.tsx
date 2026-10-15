import { CircleAlert, CircleCheck, CircleDashed, CircleX, Clock3, LoaderCircle, ShieldAlert } from "lucide-react";
export type AdminAgentStatus =
  | "completed"
  | "running"
  | "pending"
  | "failed"
  | "fallback"
  | "unavailable"
  | "unknown";

const statusConfig: Record<AdminAgentStatus, { label: string; tone: string; Icon: typeof CircleCheck }> = {
  completed: { label: "Completed", tone: "text-emerald-300", Icon: CircleCheck },
  running: { label: "Running", tone: "text-cyan-300", Icon: LoaderCircle },
  pending: { label: "Pending", tone: "text-amber-300", Icon: Clock3 },
  failed: { label: "Failed", tone: "text-red-300", Icon: CircleX },
  fallback: { label: "Fallback active", tone: "text-violet-300", Icon: ShieldAlert },
  unavailable: { label: "Unavailable", tone: "text-red-300", Icon: CircleAlert },
  unknown: { label: "Unknown", tone: "text-slate-300", Icon: CircleDashed },
};

export default function AdminAgentStatusBadge({
  status,
  lastUpdated,
}: {
  status: string | null | undefined;
  lastUpdated?: string | null;
}) {
  const normalized = status?.toLowerCase().trim() as AdminAgentStatus;
  const config = statusConfig[normalized] ?? statusConfig.unknown;
  const { Icon } = config;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-xs font-semibold ${config.tone}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{config.label}</span>
      {lastUpdated ? <span className="text-slate-500">· {lastUpdated}</span> : null}
    </span>
  );
}
