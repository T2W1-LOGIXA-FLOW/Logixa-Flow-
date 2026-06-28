"use client";

import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

type DailyRow = {
  date: string;
  total: number;
  services?: { [key: string]: number };
};

export default function CostsChart({ data }: { data: DailyRow[] }) {
  if (!data || data.length === 0) return <div className="h-64">No cost data</div>;
  // gather service keys
  const services = Array.from(
    data.reduce((acc, row) => {
      if (row.services) Object.keys(row.services).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>())
  );

  const colors = ["#00A3FF", "#FF6B00", "#0052CC", "#FFAA00", "#10b981", "#ef4444"];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="total" stroke="#111827" strokeWidth={2} dot={false} name="Total" />
          {services.map((s, i) => (
            <Line key={s} type="monotone" dataKey={(d: DailyRow) => d.services?.[s] ?? 0} name={s} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
