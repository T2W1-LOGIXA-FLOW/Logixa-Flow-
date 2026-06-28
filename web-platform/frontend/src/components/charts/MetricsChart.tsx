"use client";

import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

type MetricsRow = {
  name: string;
  agent_runs?: number;
  sources_added?: number;
  published_posts?: number;
  pending_approvals?: number;
};

export default function MetricsChart({ data }: { data: MetricsRow[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="agent_runs" stroke="#00A3FF" strokeWidth={2} dot={false} name="Agent Runs" />
          <Line type="monotone" dataKey="sources_added" stroke="#FF6B00" strokeWidth={2} dot={false} name="Sources Added" />
          <Line type="monotone" dataKey="published_posts" stroke="#0052CC" strokeWidth={2} dot={false} name="Published" />
          <Line type="monotone" dataKey="pending_approvals" stroke="#FFAA00" strokeWidth={2} dot={false} name="Pending" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
