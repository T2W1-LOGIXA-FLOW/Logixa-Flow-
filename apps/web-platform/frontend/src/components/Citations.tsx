"use client";

import React from "react";
import { IntelligenceSource } from "@/components/api";

export interface Match {
  score: number;
  source_type: string;
  source_id: string | number;
  title: string;
  content: string;
  embedding_model?: string;
}

export default function Citations({ matches, sources = [] }: { matches: Match[]; sources?: IntelligenceSource[] }) {
  if (!matches || matches.length === 0) return null;
  return (
    <aside className="citations admin-panel">
      <p className="eyebrow">Citations</p>
      <h3>Retrieved sources</h3>
      <ul className="space-y-3 mt-3">
        {matches.map((m, i) => {
          const source = sources.find((s) => String(s.id) === String(m.source_id));
          const url = source?.url;
          return (
            <li key={i} className="p-3 rounded border">
              <div className="flex justify-between items-start">
                <div className="max-w-xl">
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer" className="font-semibold block">
                      {m.title}
                    </a>
                  ) : (
                    <div className="font-semibold">{m.title}</div>
                  )}
                  <p className="muted text-sm mt-1">{m.content}</p>
                </div>
                <div className="text-xs muted ml-4">score: {m.score}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
