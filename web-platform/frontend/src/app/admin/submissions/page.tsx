"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/shadcn/Button";

interface Submission {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  read_at?: string;
}

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/submissions${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`
      );
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setSubmissions(data);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read_at: new Date() }),
      });
      if (response.ok) {
        fetchSubmissions();
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        fetchSubmissions();
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const deleteSubmission = async (id: string) => {
    if (!confirm("Are you sure you want to delete this submission?")) return;
    try {
      const response = await fetch(`/api/admin/submissions/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchSubmissions();
        setSelectedSubmission(null);
      }
    } catch (error) {
      console.error("Error deleting submission:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-cyan-500 to-orange-500 bg-clip-text text-transparent">
          Contact Submissions
        </h1>

        {/* Filter & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Total</p>
            <p className="text-2xl font-bold text-cyan-500">{submissions.length}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Pending</p>
            <p className="text-2xl font-bold text-yellow-500">
              {submissions.filter((s) => s.status === "pending").length}
            </p>
          </div>
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Replied</p>
            <p className="text-2xl font-bold text-green-500">
              {submissions.filter((s) => s.status === "replied").length}
            </p>
          </div>
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Unread</p>
            <p className="text-2xl font-bold text-red-500">
              {submissions.filter((s) => !s.read_at).length}
            </p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6">
          {["all", "pending", "replied", "archived"].map((status) => (
            <Button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`capitalize px-4 py-2 rounded-lg transition-all ${
                statusFilter === status
                  ? "bg-gradient-to-r from-cyan-500 to-orange-500 text-white"
                  : "bg-slate-800 text-slate-100 hover:bg-slate-700"
              }`}
            >
              {status}
            </Button>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Submissions List */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-slate-400">Loading...</div>
              ) : submissions.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No submissions found</div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {submissions.map((submission) => (
                    <div
                      key={submission.id}
                      onClick={() => {
                        setSelectedSubmission(submission);
                        if (!submission.read_at) markAsRead(submission.id);
                      }}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedSubmission?.id === submission.id
                          ? "bg-slate-800"
                          : "hover:bg-slate-800/50"
                      } ${!submission.read_at ? "bg-slate-800/30" : ""}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-white">{submission.name}</p>
                          <p className="text-sm text-slate-400">{submission.email}</p>
                          <p className="text-sm font-medium mt-1">{submission.subject}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(submission.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="ml-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              submission.status === "pending"
                                ? "bg-yellow-900/30 text-yellow-400"
                                : submission.status === "replied"
                                ? "bg-green-900/30 text-green-400"
                                : "bg-slate-700 text-slate-300"
                            }`}
                          >
                            {submission.status}
                          </span>
                          {!submission.read_at && (
                            <div className="mt-2 w-2 h-2 bg-cyan-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submission Details */}
          {selectedSubmission && (
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Details</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-400">Name</p>
                      <p className="font-semibold">{selectedSubmission.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Email</p>
                      <p className="font-semibold break-all">{selectedSubmission.email}</p>
                    </div>
                    {selectedSubmission.phone && (
                      <div>
                        <p className="text-sm text-slate-400">Phone</p>
                        <p className="font-semibold">{selectedSubmission.phone}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-slate-400">Date</p>
                      <p className="font-semibold">
                        {new Date(selectedSubmission.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Message</h3>
                  <p className="text-slate-300 whitespace-pre-wrap">{selectedSubmission.message}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-400 mb-3">Status</p>
                  <div className="flex gap-2">
                    {["pending", "replied", "archived"].map((status) => (
                      <Button
                        key={status}
                        onClick={() => updateStatus(selectedSubmission.id, status)}
                        className={`capitalize px-3 py-2 rounded text-sm transition-all ${
                          selectedSubmission.status === status
                            ? "bg-cyan-600 text-white"
                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => deleteSubmission(selectedSubmission.id)}
                  className="w-full py-2 bg-red-900/20 text-red-400 hover:bg-red-900/30 rounded-lg transition-all"
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
