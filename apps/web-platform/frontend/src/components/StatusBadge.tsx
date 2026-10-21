// StatusBadge — color-coded status pill for Logixa-Flow workflow statuses.
// Usage: <StatusBadge status="active" />
// Add new statuses to STATUS_STYLES as the system grows.

type Status = string;

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  active:    { bg: 'bg-emerald-500/10 border-emerald-500/25', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  running:   { bg: 'bg-blue-500/10 border-blue-500/25',       text: 'text-blue-400',    dot: 'bg-blue-400 animate-pulse' },
  pending:   { bg: 'bg-amber-500/10 border-amber-500/25',     text: 'text-amber-400',   dot: 'bg-amber-400' },
  paused:    { bg: 'bg-slate-500/10 border-slate-500/25',     text: 'text-slate-400',   dot: 'bg-slate-400' },
  completed: { bg: 'bg-green-500/10 border-green-500/25',     text: 'text-green-400',   dot: 'bg-green-400' },
  failed:    { bg: 'bg-red-500/10 border-red-500/25',         text: 'text-red-400',     dot: 'bg-red-400' },
  error:     { bg: 'bg-red-500/10 border-red-500/25',         text: 'text-red-400',     dot: 'bg-red-500' },
  inactive:  { bg: 'bg-slate-600/10 border-slate-600/25',     text: 'text-slate-500',   dot: 'bg-slate-500' },
  scheduled: { bg: 'bg-purple-500/10 border-purple-500/25',   text: 'text-purple-400',  dot: 'bg-purple-400' },
  cancelled: { bg: 'bg-orange-500/10 border-orange-500/25',   text: 'text-orange-400',  dot: 'bg-orange-400' },
};

const DEFAULT_STYLE = { bg: 'bg-slate-500/10 border-slate-500/25', text: 'text-slate-400', dot: 'bg-slate-400' };

export function StatusBadge({ status }: { status: Status }) {
  const normalized = (status ?? 'unknown').toLowerCase();
  const style = STATUS_STYLES[normalized] ?? DEFAULT_STYLE;
  const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${style.bg} ${style.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}

export default StatusBadge;
