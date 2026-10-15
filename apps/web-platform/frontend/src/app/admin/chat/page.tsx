"use client";

import { useCallback, useEffect, useState } from "react";

import { adminFetch, listAdminChatSessions, type AdminChatSession } from "@/components/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function AdminChatManagementPage() {
  const { token, isAuthenticated } = useAdminAuth();
  const [sessions, setSessions] = useState<AdminChatSession[]>([]);
  const [selected, setSelected] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!token || !isAuthenticated) return;
    setLoading(true);
    try {
      setSessions(await listAdminChatSessions(token));
    } catch {
      setMessage("Chat sessions are unavailable.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => { void loadSessions(); }, [loadSessions]);

  async function restoreSession() {
    if (!token || !selected) return;
    setLoading(true);
    try {
      const response = await adminFetch(`/api/chat/sessions/${encodeURIComponent(selected)}/restore`, token);
      const restored = await response.json() as { messages: unknown[] };
      setMessage(`Restored ${restored.messages.length} messages.`);
    } catch {
      setMessage("The selected session could not be restored.");
    } finally {
      setLoading(false);
    }
  }

  async function transferSession() {
    if (!token || !selected || !newOwner.trim()) return;
    setLoading(true);
    try {
      await adminFetch(`/api/chat/sessions/${encodeURIComponent(selected)}/transfer`, token, {
        method: "POST",
        body: JSON.stringify({ new_owner_id: newOwner.trim() }),
      });
      setMessage("Session ownership transferred.");
      setNewOwner("");
      await loadSessions();
    } catch {
      setMessage("Ownership transfer was not permitted.");
    } finally {
      setLoading(false);
    }
  }

  async function cleanupSessions() {
    if (!token) return;
    setLoading(true);
    try {
      const response = await adminFetch("/api/chat/sessions/cleanup?older_than_days=30", token, { method: "POST" });
      const result = await response.json() as { cleaned: number };
      setMessage(`Soft-cleaned ${result.cleaned} stale sessions.`);
      await loadSessions();
    } catch {
      setMessage("Session cleanup is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated || !token) return <main className="page-shell"><p className="admin-status">Admin authentication required.</p></main>;

  return (
    <main className="page-shell">
      <section className="admin-panel">
        <p className="eyebrow">Chat management</p>
        <h1>Session management</h1>
        <p className="muted">Restore and transfer only sessions owned by the authenticated administrator. Cleanup is soft-delete only.</p>
        <label htmlFor="chat-session">Session</label>
        <select id="chat-session" aria-label="Chat session" value={selected} onChange={(event) => setSelected(event.target.value)}>
          <option value="">Choose a session</option>
          {sessions.map((session) => <option key={session.session_id} value={session.session_id}>{session.title}</option>)}
        </select>
        <div className="mt-4 flex gap-3">
          <button className="ghost-button" type="button" onClick={() => void restoreSession()} disabled={loading || !selected}>Restore session</button>
          <button className="ghost-button" type="button" onClick={() => void cleanupSessions()} disabled={loading}>Clean up stale sessions</button>
        </div>
        <div className="mt-4">
          <label htmlFor="chat-new-owner">Transfer ownership to</label>
          <input id="chat-new-owner" value={newOwner} onChange={(event) => setNewOwner(event.target.value)} placeholder="Owner ID" />
          <button className="primary-button mt-2" type="button" onClick={() => void transferSession()} disabled={loading || !selected || !newOwner.trim()}>Transfer ownership</button>
        </div>
        {message ? <p role="status" className="admin-status">{message}</p> : null}
      </section>
    </main>
  );
}
