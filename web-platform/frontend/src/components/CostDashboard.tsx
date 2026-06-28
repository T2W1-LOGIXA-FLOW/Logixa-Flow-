"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Skeleton from "./shadcn/Skeleton";
import Button from "./shadcn/Button";
import EmptyState from "./EmptyState";
import ErrorState from "./ErrorState";
import { adminFetch } from "./api";
import CostsChart from "./charts/CostsChart";

type DailyRow = {
  date: string;
  total: number;
  services?: { [key: string]: number };
};

interface CostCardPayload {
  label?: string;
  name?: string;
  value?: string | number;
  amount?: string | number;
  tone?: string;
}

interface CostSummaryPayload {
  cards?: CostCardPayload[];
  summary?: Record<string, unknown>;
  totals?: Record<string, unknown>;
  topline?: Record<string, unknown>;
  daily?: DailyRow[];
  rows?: DailyRow[];
  data?: DailyRow[];
};

function readMetricValue(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return value == null ? "" : String(value);
}

export default function CostDashboard({
  token,
}: {
  token: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<{ label: string; value: string; tone?: string }[]>([]);
  const [data, setData] = useState<DailyRow[]>([]);

  const loadCosts = useCallback(async (showRefreshToast = false) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await adminFetch("/api/admin/costs/summary", token);
      const payload = (await response.json()) as CostSummaryPayload;

      let parsedCards: { label: string; value: string; tone?: string }[] = [];
      if (Array.isArray(payload.cards)) {
        parsedCards = payload.cards.map((c) => ({
          label: c.label || c.name || "",
          value: String(c.value ?? c.amount ?? ""),
          tone: c.tone,
        }));
      } else if (payload.summary && typeof payload.summary === "object") {
        parsedCards = Object.keys(payload.summary).map((k) => ({
          label: String(k).replace(/_/g, " "),
          value: readMetricValue(payload.summary!, k),
        }));
      } else if (payload.totals && typeof payload.totals === "object") {
        parsedCards = Object.keys(payload.totals).map((k) => ({
          label: String(k).replace(/_/g, " "),
          value: readMetricValue(payload.totals!, k),
        }));
      } else if (payload.topline && typeof payload.topline === "object") {
        parsedCards = Object.keys(payload.topline).map((k) => ({
          label: String(k).replace(/_/g, " "),
          value: readMetricValue(payload.topline!, k),
        }));
      }

      let parsedDaily: DailyRow[] = [];
      if (Array.isArray(payload.daily)) parsedDaily = payload.daily;
      else if (Array.isArray(payload.rows)) parsedDaily = payload.rows;
      else if (Array.isArray(payload.data)) parsedDaily = payload.data;

      setCards(parsedCards);
      setData(parsedDaily || []);
      if (showRefreshToast) {
        toast.success("Cost data refreshed");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not load cost summary.";
      setError(message);
      toast.error("Cost summary could not be loaded.");
      console.error("CostDashboard error:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadCosts();
  }, [loadCosts]);

  const hasCostData =
    data.length > 0 ||
    cards.some((card) => {
      const numeric = parseFloat(card.value.replace(/[^0-9.-]/g, ""));
      return !Number.isNaN(numeric) && numeric !== 0;
    });

  return (
    <section className="admin-panel costs-panel">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow">Cost Insights</p>
          <h2>Cloud & Services Spend</h2>
          <p className="muted">Daily cost rollups, service breakdowns, and quick summary metrics from the billing connector.</p>
        </div>
        <Button type="button" variant="ghost" disabled={loading} onClick={() => loadCosts(true)}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="admin-metric-grid">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to load cost data"
          description={error}
          actionLabel="Retry"
          actionOnClick={() => loadCosts()}
        />
      ) : !hasCostData ? (
        <EmptyState
          icon="💰"
          title="No cost data yet"
          description="Connect billing or run agent workloads to populate spend metrics."
          actionLabel="Refresh"
          actionOnClick={() => loadCosts(true)}
        />
      ) : (
        <>
          <div className="admin-metric-grid">
            {cards.map((card) => (
              <article className={`admin-metric-card ${card.tone || ""}`} key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </article>
            ))}
          </div>

          <div className="admin-panel">
            <h3 className="eyebrow">Daily Trend</h3>
            <CostsChart data={data} />
          </div>
        </>
      )}
    </section>
  );
}
