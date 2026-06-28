"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AiMemory, Post, adminFetch, IntelligenceSource } from "@/components/api";
import EmptyState from "@/components/EmptyState";
import Skeleton from "@/components/shadcn/Skeleton";
import Citations, { Match } from "@/components/Citations";

const filters: Array<AiMemory["status"] | "all"> = ["pending", "approved", "rejected", "published", "all"];

export default function BrainReviewPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [items, setItems] = useState<AiMemory[]>([]);
  const [filter, setFilter] = useState<AiMemory["status"] | "all">("pending");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [matches] = useState<Match[]>([]);
  const [sourcesList] = useState<IntelligenceSource[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("adminToken");
    if (!saved) {
      router.push("/admin/login");
      return;
    }
    setToken(saved);
  }, [router]);

  useEffect(() => {
    if (!token) {
      return;
    }
    setItemsLoading(true);
    setItemsError(null);
    const path = filter === "all" ? "/api/admin/brain" : `/api/admin/brain?status=${filter}`;
    adminFetch(path, token)
      .then((response) => response.json())
      .then((records: AiMemory[]) => {
        setItems(records);
        setSelectedId(records[0]?.id || null);
        setItemsLoading(false);
      })
      .catch(() => {
        setItemsError("Failed to load brain queue. Please try again.");
        setItemsLoading(false);
        toast.error("Brain queue could not be loaded.");
      });
  }, [filter, token]);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) || items[0], [items, selectedId]);

  async function refresh(nextFilter = filter) {
    const path = nextFilter === "all" ? "/api/admin/brain" : `/api/admin/brain?status=${nextFilter}`;
    const response = await adminFetch(path, token);
    const records = (await response.json()) as AiMemory[];
    setItems(records);
    setSelectedId(records[0]?.id || null);
  }

  async function brainAction(action: "approve" | "reject") {
    if (!selected) {
      return;
    }
    try {
      await adminFetch(`/api/admin/brain/${selected.id}/${action}`, token, { method: "PATCH" });
      toast.success(action === "approve" ? "Draft approved but still private." : "Draft rejected.");
      await refresh();
    } catch {
      toast.error(`Failed to ${action} draft. Please try again.`);
    }
  }

  async function publish(publishNow: boolean) {
    if (!selected) {
      return;
    }
    try {
      const response = await adminFetch(`/api/admin/brain/${selected.id}/publish`, token, {
        method: "PATCH",
        body: JSON.stringify({ publish_now: publishNow }),
      });
      const post = (await response.json()) as Post;
      toast.success(publishNow ? `Published: ${post.slug}` : `CMS draft created: ${post.slug}`);
      await refresh(publishNow ? "published" : "approved");
      setFilter(publishNow ? "published" : "approved");
    } catch {
      toast.error("Failed to publish. Please try again.");
    }
  }

  if (!token) {
    return (
      <main className="page-shell brain-review-page">
        <div className="max-w-4xl mx-auto py-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 w-3/4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-8 w-1/3" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-64 col-span-2" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell brain-review-page">
      <section className="agent-header">
        <div>
          <p className="eyebrow">Human Review</p>
          <h1>AI Brain Queue</h1>
          <p className="muted">Agent output stays private here until an admin approves or publishes it.</p>
        </div>
        <Link className="ghost-button" href="/agent">
          Run Agent
        </Link>
      </section>

      <div className="review-filter-row">
        {filters.map((item) => (
          <button className={filter === item ? "active" : ""} key={item} type="button" onClick={() => setFilter(item)}>
            {item}
          </button>
        ))}
      </div>

      <section className="brain-review-grid">
        <div className="admin-panel brain-list">
          <p className="eyebrow">Queue</p>
          {itemsError ? (
            <div className="brain-list-empty">
              <EmptyState
                icon="⚠️"
                title="Failed to load brain queue"
                description={itemsError}
                actionLabel="Retry"
                actionOnClick={() => {
                  setItemsError(null);
                  setItemsLoading(true);
                  const path = filter === "all" ? "/api/admin/brain" : `/api/admin/brain?status=${filter}`;
                  adminFetch(path, token)
                    .then((response) => response.json())
                    .then((records: AiMemory[]) => {
                      setItems(records);
                      setSelectedId(records[0]?.id || null);
                      setItemsLoading(false);
                    })
                    .catch(() => {
                      setItemsError("Failed to load brain queue. Please try again.");
                      setItemsLoading(false);
                      toast.error("Brain queue could not be loaded.");
                    });
                }}
              />
            </div>
          ) : itemsLoading ? (
            <div className="brain-list-empty">
              <Skeleton className="h-16 w-full mb-2" />
              <Skeleton className="h-16 w-full mb-2" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : items.length ? (
            items.map((item) => (
              <button className={selected?.id === item.id ? "active" : ""} key={item.id} type="button" onClick={() => setSelectedId(item.id)}>
                <span>{item.status}</span>
                <strong>{item.source_title}</strong>
                <small>{item.category}</small>
              </button>
            ))
          ) : (
            <div className="brain-list-empty">
              <EmptyState
                icon="🧠"
                title={`No ${filter} items`}
                description="Run the AI agent to generate drafts for review, or select a different filter."
                actionLabel="Run Agent"
                actionHref="/agent"
              />
            </div>
          )}
        </div>

        <article className="admin-panel brain-detail">
          {selected ? (
            <>
              <div className="brain-detail-top">
                <div>
                  <p className="eyebrow">{selected.category}</p>
                  <h2>{selected.source_title}</h2>
                  <p className="muted">{selected.summary}</p>
                </div>
                <span className={`brain-status ${selected.status}`}>{selected.status}</span>
              </div>
              <div className="brain-actions">
                <button className="ghost-button" type="button" onClick={() => brainAction("approve")}>
                  Approve
                </button>
                <button className="ghost-button danger" type="button" onClick={() => brainAction("reject")}>
                  Reject
                </button>
                <button className="ghost-button" type="button" onClick={() => publish(false)}>
                  Create CMS Draft
                </button>
                <button className="primary-button" type="button" onClick={() => publish(true)}>
                  Publish
                </button>
              </div>
              <div className="draft-preview" dangerouslySetInnerHTML={{ __html: selected.content }} />
              <Citations matches={matches} sources={sourcesList} />
            </>
          ) : (
            <p className="empty-state">Select a brain record to review.</p>
          )}
        </article>
      </section>
    </main>
  );
}
