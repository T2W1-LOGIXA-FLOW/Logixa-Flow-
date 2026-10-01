"use client";

import type { ReactNode } from "react";

export type BentoItem = {
  title: string;
  meta?: string;
  description?: string;
  icon?: ReactNode;
  status?: string;
  tags?: string[];
  colSpan?: 1 | 2;
  hasPersistentHover?: boolean;
};

type BentoGridProps = {
  items: BentoItem[];
  className?: string;
};

export function BentoGrid({ items, className = "" }: BentoGridProps) {
  return (
    <div
      className={[
        "grid grid-cols-1 gap-4 md:grid-cols-3",
        className,
      ].join(" ")}
    >
      {items.map((item) => (
        <article
          key={item.title}
          className={[
            "group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-200",
            "dark:border-slate-700/70 dark:bg-slate-900/80",
            "hover:-translate-y-0.5 hover:shadow-lg",
            item.colSpan === 2 ? "md:col-span-2" : "md:col-span-1",
            item.hasPersistentHover ? "ring-1 ring-cyan-500/20" : "",
          ].join(" ")}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {item.icon ? (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                  {item.icon}
                </span>
              ) : null}
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-slate-900 dark:text-white">
                  {item.title}
                </h3>
                {item.meta ? (
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {item.meta}
                  </p>
                ) : null}
              </div>
            </div>
            {item.status ? (
              <span className="shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                {item.status}
              </span>
            ) : null}
          </div>

          {item.description ? (
            <p className="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {item.description}
            </p>
          ) : null}

          {item.tags?.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
