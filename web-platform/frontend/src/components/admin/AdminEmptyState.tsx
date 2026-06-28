import Link from "next/link";
import { Plus } from "lucide-react";

interface AdminEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
}

export default function AdminEmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
}: AdminEmptyStateProps) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-slate-800/50 rounded-full p-6 mb-4">
        <Plus className="h-8 w-8 text-slate-500" />
      </div>
      <h3 className="text-lg font-medium text-slate-300 mb-2">{title}</h3>
      <p className="text-slate-500 mb-6 max-w-md">{description}</p>
      {actionLabel && (actionHref || actionOnClick) && (
        <>
          {actionHref ? (
            <Link
              href={actionHref}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              onClick={actionOnClick}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition"
            >
              {actionLabel}
            </button>
          )}
        </>
      )}
    </div>
  );
}
