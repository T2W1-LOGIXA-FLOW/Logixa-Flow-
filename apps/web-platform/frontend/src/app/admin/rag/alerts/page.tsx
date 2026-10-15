"use client";

import { useCallback, useEffect, useState } from "react";

import { adminFetch } from "@/components/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";

type Alert = {
  alert_id: string;
  alert_type: string;
  severity: string;
  message: string;
  created_at: string;
  errors: number;
  threshold: number;
  channels: { channel: string; enabled: boolean }[];
  dispatch: string;
};

type AlertState = {
  threshold: number;
  channels: { channel: string; enabled: boolean }[];
  alerts: Alert[];
};

export default function AdminRagAlertsPage() {
  const { token, isAuthenticated } = useAdminAuth();
  const [threshold, setThreshold] = useState("5");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [channels, setChannels] = useState([{ channel: "in_app", enabled: true }]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadAlerts = useCallback(async () => {
    if (!token || !isAuthenticated) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await adminFetch("/api/admin/rag/alerts", token);
      const state = (await response.json()) as AlertState;
      setThreshold(String(state.threshold));
      setChannels(state.channels);
      setAlerts(state.alerts);
    } catch {
      setMessage("RAG alerts are unavailable. Retry or contact an administrator.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  async function saveConfiguration() {
    if (!token || !isAuthenticated) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await adminFetch("/api/admin/rag/alerts/config", token, {
        method: "POST",
        body: JSON.stringify({
          threshold: Number(threshold),
          channels,
        }),
      });
      const state = (await response.json()) as { threshold: number; persistent: boolean };
      setThreshold(String(state.threshold));
      setMessage(state.persistent ? "Alert configuration saved." : "Alert configuration applied for this process only.");
    } catch {
      setMessage("Alert configuration could not be applied.");
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated || !token) {
    return <main className="page-shell"><p className="admin-status">Admin authentication required.</p></main>;
  }

  return (
    <main className="page-shell">
      <section className="admin-panel">
        <p className="eyebrow">RAG alerting</p>
        <h1>Alert management</h1>
        <p className="muted">Configure safe in-process alerts. Notifications are mocked and never sent to external services.</p>
        <div className="flex items-center gap-3">
          <label htmlFor="rag-alert-threshold">Error threshold</label>
          <input
            id="rag-alert-threshold"
            type="number"
            min="1"
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
          />
          <button className="primary-button" type="button" onClick={() => void saveConfiguration()} disabled={loading}>
            {loading ? "Applying..." : "Apply configuration"}
          </button>
        </div>
        <fieldset className="mt-4">
          <legend>Notification channels</legend>
          {channels.map((channel) => (
            <label key={channel.channel} className="block">
              <input
                type="checkbox"
                checked={channel.enabled}
                onChange={(event) => setChannels([{ ...channel, enabled: event.target.checked }])}
              />
              {" "}{channel.channel} (mock)
            </label>
          ))}
        </fieldset>
        {message ? <p role="status" className="admin-status">{message}</p> : null}
        <section aria-label="Alert history" className="admin-status">
          <h2>Alert history</h2>
          {alerts.length === 0 ? <p>No alerts recorded.</p> : null}
          {alerts.map((alert) => (
            <article key={alert.alert_id}>
              <strong>{alert.severity}: {alert.alert_type}</strong>
              <p>{alert.message}</p>
              <p>{alert.errors} errors / threshold {alert.threshold} · {alert.dispatch}</p>
              <time dateTime={alert.created_at}>{alert.created_at}</time>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
