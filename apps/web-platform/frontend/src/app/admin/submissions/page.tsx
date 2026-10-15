"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/shadcn/Button";
import { adminFetch } from "@/components/api";
import { getAdminSessionToken } from "@/lib/adminSession";

interface Submission {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  read_at?: string | null;
  updated_at?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to load submissions.";
}

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getAdminSessionToken();
      if (!token) throw new Error("Admin session is required");

      const query = statusFilter === "all" ? "" : `?status=${encodeURIComponent(statusFilter)}`;
      const response = await adminFetch(`/api/admin/submissions${query}`, token);
      const data = (await response.json()) as Submission[];
      setSubmissions(data);
      setSelectedSubmission((current) =>
        current ? data.find((submission) => submission.id === current.id) ?? null : null
      );
    } catch (requestError) {
      setSubmissions([]);
      setSelectedSubmission(null);
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void fetchSubmissions();
  }, [fetchSubmissions]);

  const markAsRead = async (id: string) => {
    setError("");
    try {
      const token = await getAdminSessionToken();
      if (!token) throw new Error("Admin session is required");
      await adminFetch(
        `/api/admin/submissions/${encodeURIComponent(id)}/mark-read`,
        token,
        { method: "POST" }
      );
      await fetchSubmissions();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setError("");
    try {
      const token = await getAdminSessionToken();
      if (!token) throw new Error("Admin session is required");
      const response = await adminFetch(
        `/api/admin/submissions/${encodeURIComponent(id)}`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
        }
      );
      const updated = (await response.json()) as Submission;
      setSubmissions((current) =>
        current.map((submission) => (submission.id === id ? updated : submission))
      );
      setSelectedSubmission((current) => (current?.id === id ? updated : current));
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const deleteSubmission = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this submission?")) return;
    setError("");
    try {
      const token = await getAdminSessionToken();
      if (!token) throw new Error("Admin session is required");
      await adminFetch(
        `/api/admin/submissions/${encodeURIComponent(id)}`,
        token,
        { method: "DELETE" }
      );
      setSubmissions((current) => current.filter((submission) => submission.id !== id));
      setSelectedSubmission((current) => (current?.id === id ? null : current));
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-8 bg-gradient-to-r from-cyan-500 to-orange-500 bg-clip-text text-4xl font-bold text-transparent">
          Contact Submissions
        </h1>

        {error && (
          <div role="alert" className="mb-6 rounded-lg border border-red-500/30 bg-red-950/40 p-4 text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
              <p className="text-sm text-slate-400">Total</p>
              <p className="text-2xl font-bold text-cyan-500">{submissions.length}</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
              <p className="text-sm text-slate-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-500">
                {submissions.filter((submission) => submission.status === "pending").length}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
              <p className="text-sm text-slate-400">Replied</p>
              <p className="text-2xl font-bold text-green-500">
                {submissions.filter((submission) => submission.status === "replied").length}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
              <p className="text-sm text-slate-400">Unread</p>
              <p className="text-2xl font-bold text-red-500">
                {submissions.filter((submission) => !submission.read_at).length}
              </p>
            </div>
          </div>
        )}

        <div className="mb-6 flex gap-2">
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 overflow-hidden rounded-lg border border-slate-700 bg-slate-900/50">
            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading submissions...</div>
            ) : error ? null : submissions.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No submissions found.</div>
            ) : (
              <div className="divide-y divide-slate-700">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    onClick={() => {
                      setSelectedSubmission(submission);
                      if (!submission.read_at) void markAsRead(submission.id);
                    }}
                    className={`cursor-pointer p-4 transition-colors ${
                      selectedSubmission?.id === submission.id ? "bg-slate-800" : "hover:bg-slate-800/50"
                    } ${!submission.read_at ? "bg-slate-800/30" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-white">{submission.name}</p>
                        <p className="text-sm text-slate-400">{submission.email}</p>
                        <p className="mt-1 text-sm font-medium">{submission.subject}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(submission.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-300">
                        {submission.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedSubmission && !error && (
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6">
              <h2 className="mb-4 text-lg font-semibold">Submission details</h2>
              <dl className="space-y-3">
                <div><dt className="text-sm text-slate-400">Name</dt><dd>{selectedSubmission.name}</dd></div>
                <div><dt className="text-sm text-slate-400">Email</dt><dd className="break-all">{selectedSubmission.email}</dd></div>
                {selectedSubmission.phone && (
                  <div><dt className="text-sm text-slate-400">Phone</dt><dd>{selectedSubmission.phone}</dd></div>
                )}
                <div><dt className="text-sm text-slate-400">Date</dt><dd>{new Date(selectedSubmission.created_at).toLocaleString()}</dd></div>
              </dl>
              <h3 className="mb-2 mt-6 font-semibold">Message</h3>
              <p className="whitespace-pre-wrap text-slate-300">{selectedSubmission.message}</p>
              <p className="mb-3 mt-6 text-sm text-slate-400">Status</p>
              <div className="flex flex-wrap gap-2">
                {["pending", "replied", "archived"].map((status) => (
                  <Button
                    key={status}
                    onClick={() => void updateStatus(selectedSubmission.id, status)}
                    className="rounded bg-slate-700 px-3 py-2 text-sm capitalize text-slate-200 hover:bg-slate-600"
                  >
                    {status}
                  </Button>
                ))}
              </div>
              <Button
                onClick={() => void deleteSubmission(selectedSubmission.id)}
                className="mt-6 w-full rounded-lg bg-red-900/20 py-2 text-red-400 hover:bg-red-900/30"
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
