"use client";

import React, { useEffect, useState } from "react";
import { adminFetch } from "@/components/api";
import { getAdminSessionToken } from "@/lib/adminSession";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, LineChart, Line, Legend } from "recharts";

type Project = {
  id: number;
  name: string;
  estimated_revenue: number;
  estimated_cost: number;
  actual_revenue: number;
  actual_cost: number;
  status: string;
  created_at?: string | null;
};

export default function AdminFinancePage() {
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formEstRev, setFormEstRev] = useState(0);
  const [formEstCost, setFormEstCost] = useState(0);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const token = await getAdminSessionToken();
    try {
      if (!token) throw new Error("no token");
      const sresp = await adminFetch("/api/admin/finance/summary", token).catch(() => null);
      if (sresp) setSummary(await sresp.json().catch(() => ({})));
      const presp = await adminFetch("/api/admin/finance/projects", token).catch(() => null);
      if (presp) setProjects(await presp.json().then((j) => j.projects || []).catch(() => []));
    } catch (err) {
      console.error(err);
      setError("Could not load finance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getAdminSessionToken();
    if (!token) return setError("Admin session missing");
    try {
      await adminFetch("/api/admin/finance/projects", token, {
        method: "POST",
        body: JSON.stringify({ name: formName, estimated_revenue: formEstRev, estimated_cost: formEstCost }),
      });
      setFormName("");
      setFormEstRev(0);
      setFormEstCost(0);
      await loadData();
    } catch (err) {
      console.error(err);
      setError("Failed to add project");
    }
  };

  const runScenario = () => {
    const revStr = window.prompt("Enter expected additional revenue:", "0");
    if (revStr === null) return;
    const costStr = window.prompt("Enter expected additional cost:", "0");
    if (costStr === null) return;
    const rev = Number(revStr || 0);
    const cost = Number(costStr || 0);
    const profit = rev - cost;
    window.alert(`Scenario result:\nRevenue: $${rev.toLocaleString()}\nCost: $${cost.toLocaleString()}\nProfit: $${profit.toLocaleString()}`);
  };

  // Prepare chart data: for each project compare estimated vs estimated_cost; also compute profit margin
  const projChart = projects.map((p) => ({ name: p.name, revenue: p.estimated_revenue || 0, expenses: p.estimated_cost || 0, profit: (p.actual_revenue || p.estimated_revenue || 0) - (p.actual_cost || p.estimated_cost || 0) }));
  const profitMarginData = projChart.map((p) => ({ name: p.name, margin: p.revenue ? Math.round(((p.revenue - p.expenses) / p.revenue) * 100) : 0 }));

  const companyBudget = (summary?.company_budget as Record<string, unknown> | null) ?? null;
  const totalBudget = companyBudget && typeof companyBudget["total_budget"] === "number" ? (companyBudget["total_budget"] as number) : null;
  const spentAmount = companyBudget && typeof companyBudget["spent_amount"] === "number" ? (companyBudget["spent_amount"] as number) : null;
  const budgetRemaining = totalBudget != null ? totalBudget - (spentAmount || 0) : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Finance</h1>
        <p className="mt-1 text-sm text-slate-400">Company finance summary, projects, and scenario planning.</p>
      </header>

      {loading ? (
        <div className="text-slate-300">Loading...</div>
      ) : error ? (
        <div className="text-red-300">{error}</div>
      ) : (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs uppercase text-slate-400">Total Revenue</p>
              <p className="mt-2 text-2xl font-black text-white">{summary?.revenue != null ? `$${Number(summary.revenue).toLocaleString()}` : "-"}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs uppercase text-slate-400">Total Expenses</p>
              <p className="mt-2 text-2xl font-black text-white">{summary?.expenses != null ? `$${Number(summary.expenses).toLocaleString()}` : "-"}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs uppercase text-slate-400">Net Profit</p>
              <p className="mt-2 text-2xl font-black text-white">{summary?.profit != null ? `$${Number(summary.profit).toLocaleString()}` : "-"}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs uppercase text-slate-400">Budget Remaining</p>
              <p className="mt-2 text-2xl font-black text-white">{budgetRemaining != null ? `$${Number(budgetRemaining).toLocaleString()}` : "-"}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="text-sm font-semibold text-white">Revenue vs Expenses (by project)</h3>
              <div style={{ width: '100%', height: 300 }} className="mt-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={projChart} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid stroke="#1f2937" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8' }} />
                    <YAxis tick={{ fill: '#94a3b8' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#06b6d4" />
                    <Bar dataKey="expenses" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="text-sm font-semibold text-white">Profit Margin % (by project)</h3>
              <div style={{ width: '100%', height: 300 }} className="mt-4">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={profitMarginData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid stroke="#1f2937" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8' }} />
                    <YAxis tick={{ fill: '#94a3b8' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="margin" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Projects</h3>
              <div className="flex items-center gap-2">
                <button onClick={runScenario} className="rounded-md border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-100">Run Scenario</button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg bg-slate-900 p-2">
              <table className="w-full table-auto text-sm">
                <thead>
                  <tr className="text-slate-400">
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-right">Estimated Revenue</th>
                    <th className="px-3 py-2 text-right">Estimated Cost</th>
                    <th className="px-3 py-2 text-right">Actual Revenue</th>
                    <th className="px-3 py-2 text-right">Actual Cost</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id} className="border-t border-slate-800 hover:bg-slate-800/40 transition">
                      <td className="px-3 py-2 text-slate-200">{p.name}</td>
                      <td className="px-3 py-2 text-right text-slate-200">${Number(p.estimated_revenue || 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-slate-200">${Number(p.estimated_cost || 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-slate-200">${Number(p.actual_revenue || 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-slate-200">${Number(p.actual_cost || 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-slate-200">{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form onSubmit={addProject} className="mt-4 grid gap-2 md:grid-cols-4">
              <input className="rounded-md bg-slate-800/40 px-3 py-2 text-slate-200" placeholder="Project name" value={formName} onChange={(e) => setFormName(e.target.value)} required />
              <input type="number" className="rounded-md bg-slate-800/40 px-3 py-2 text-slate-200" placeholder="Estimated revenue" value={formEstRev} onChange={(e) => setFormEstRev(Number(e.target.value))} />
              <input type="number" className="rounded-md bg-slate-800/40 px-3 py-2 text-slate-200" placeholder="Estimated cost" value={formEstCost} onChange={(e) => setFormEstCost(Number(e.target.value))} />
              <button className="rounded-md border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">Add Project</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
