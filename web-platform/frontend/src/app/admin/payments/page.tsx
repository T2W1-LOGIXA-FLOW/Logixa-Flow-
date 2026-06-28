"use client";

import { useState, useEffect, useCallback } from "react";

interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  created_at: string;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/payments${filter !== "all" ? `?status=${filter}` : ""}`
      );
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-900/30 text-green-400";
      case "pending":
        return "bg-yellow-900/30 text-yellow-400";
      case "failed":
        return "bg-red-900/30 text-red-400";
      case "refunded":
        return "bg-blue-900/30 text-blue-400";
      default:
        return "bg-slate-800 text-slate-300";
    }
  };

  const calculateTotals = () => {
    return {
      total: payments.reduce((sum, p) => sum + p.amount, 0),
      count: payments.length,
      paid: payments.filter((p) => p.status === "paid").length,
      pending: payments.filter((p) => p.status === "pending").length,
      failed: payments.filter((p) => p.status === "failed").length,
    };
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-cyan-500 to-orange-500 bg-clip-text text-transparent">
          Payment Management
        </h1>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm mb-2">Total Revenue</p>
            <p className="text-3xl font-bold text-cyan-500">${totals.total.toFixed(2)}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm mb-2">Total Transactions</p>
            <p className="text-3xl font-bold text-orange-500">{totals.count}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm mb-2">Paid</p>
            <p className="text-3xl font-bold text-green-500">{totals.paid}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm mb-2">Pending</p>
            <p className="text-3xl font-bold text-yellow-500">{totals.pending}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm mb-2">Failed</p>
            <p className="text-3xl font-bold text-red-500">{totals.failed}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {["all", "paid", "pending", "failed"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`capitalize px-4 py-2 rounded-lg transition-all ${
                filter === status
                  ? "bg-gradient-to-r from-cyan-500 to-orange-500 text-white"
                  : "bg-slate-800 text-slate-100 hover:bg-slate-700"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Payments Table */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading...</div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No payments found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Payment ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">User</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Description</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-sm">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-400">
                        {payment.id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 text-sm">{payment.user_id.slice(0, 8)}...</td>
                      <td className="px-6 py-4 text-sm">{payment.description}</td>
                      <td className="px-6 py-4 text-sm font-semibold">
                        ${payment.amount.toFixed(2)} {payment.currency.toUpperCase()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(payment.status)}`}>
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
