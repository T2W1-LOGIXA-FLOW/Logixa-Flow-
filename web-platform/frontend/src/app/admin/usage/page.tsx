"use client";

import React, { useEffect, useState } from "react";
import { adminFetch } from "@/components/api";
import { getAdminSessionToken } from "@/lib/adminSession";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function UsagePage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadUsage() {
      const token = await getAdminSessionToken();
      if (!token || cancelled) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await adminFetch("/api/admin/usage", token);
        const json = await response.json();
        const items = (json.usage_by_key as Record<string, unknown>[]) || [];
        setRows(items);
      } catch (err) {
        console.error("Usage load error:", err);
        setError("Could not load usage data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadUsage();
    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = rows.map((r) => ({
    name: (r.api_key_name as string) || (r.provider as string) || "unknown",
    tokens: Number((r.tokens as number) || 0),
    cost: Number((r.cost as number) || 0),
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">API Usage</h1>
        <p className="mt-1 text-sm text-slate-400">Usage and cost by provider and key.</p>
      </header>

      {loading ? (
        <div className="text-slate-300">Loading...</div>
      ) : error ? (
        <div className="text-red-300">{error}</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="text-lg font-semibold text-white">Usage by key</h2>
            <div className="mt-4 overflow-x-auto rounded-lg bg-slate-900 p-2">
              <table className="w-full table-auto text-sm">
                <thead>
                  <tr className="text-slate-400">
                    <th className="px-3 py-2 text-left">Provider</th>
                    <th className="px-3 py-2 text-left">API Key</th>
                    <th className="px-3 py-2 text-right">Tokens</th>
                    <th className="px-3 py-2 text-right">Cost</th>
                    <th className="px-3 py-2 text-right">Calls</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${String(r.provider)}-${String(r.api_key_name)}`} className="border-t border-slate-800 hover:bg-slate-800/40 transition">
                      <td className="px-3 py-2 text-slate-200">{String(r.provider)}</td>
                      <td className="px-3 py-2 text-slate-200">{String(r.api_key_name)}</td>
                      <td className="px-3 py-2 text-right text-slate-200">{Number(r.tokens || 0)}</td>
                      <td className="px-3 py-2 text-right text-slate-200">${Number(r.cost || 0).toFixed(4)}</td>
                      <td className="px-3 py-2 text-right text-slate-200">{Number(r.calls || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="text-lg font-semibold text-white">Token usage & cost</h2>
            <div style={{ width: '100%', height: 360 }} className="mt-4">
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid stroke="#1f2937" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8' }} />
                  <YAxis tick={{ fill: '#94a3b8' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="tokens" fill="#06b6d4" />
                  <Bar dataKey="cost" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
