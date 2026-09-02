"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { AiMemory, Post, adminFetch, IntelligenceSource } from "@/components/api";
import EmptyState from "@/components/EmptyState";
import Skeleton from "@/components/shadcn/Skeleton";
import Citations, { Match } from "@/components/Citations";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { sanitizeHtml } from "@/lib/sanitize-html";

const filters: Array<AiMemory["status"] | "all"> = ["pending", "approved", "rejected", "published", "all"];

export default function BrainReviewPage() {
  const { token, isAuthenticated, isCheckingAuth } = useAdminAuth();
  const [items, setItems] = useState<AiMemory[]>([]);
  const [filter, setFilter] = useState<AiMemory["status"] | "all">("pending");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [matches] = useState<Match[]>([]);
  const [sourcesList] = useState<IntelligenceSource[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
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
  }, [filter, token, isAuthenticated]);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) || items[0], [items, selectedId]);
  const safeSelectedContent = useMemo(() => sanitizeHtml(selected?.content || ""), [selected?.content]);

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
      const result = response.headers.get("X-Brain-Publish-Result");
      toast.success(
        result === "idempotent"
          ? `Already linked: ${post.slug}`
          : result === "republished_linked"
            ? `Republished linked post: ${post.slug}`
            : publishNow
              ? `Published: ${post.slug}`
              : `CMS draft created: ${post.slug}`,
      );
      await refresh(publishNow ? "published" : "approved");
      setFilter(publishNow ? "published" : "approved");
    } catch {
      toast.error("Failed to publish. Please try again.");
    }
  }

  async function unpublish() {
    if (!selected || selected.status !== "published" || !selected.is_public || !selected.post_slug) {
      return;
    }
    const confirmed = window.confirm(
      "Unpublish this linked post? This reversible soft-unpublish keeps the brain memory and post for recovery but removes public visibility.",
    );
    if (!confirmed) {
      return;
    }
    setActionPending(true);
    try {
      await adminFetch(`/api/admin/brain/${selected.id}/unpublish`, token, { method: "PATCH" });
      toast.success("Content unpublished and kept for recovery.");
      await refresh("published");
    } catch {
      toast.error("Failed to unpublish. Please try again.");
    } finally {
      setActionPending(false);
    }
  }

  if (isCheckingAuth || !isAuthenticated || !token) {
    return (
      <main className="page-shell">
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
          <h1>AI Memory</h1>
          <p className="muted">Agent output stays private here until an admin approves or publishes it.</p>
        </div>
        <Link className="ghost-button" href="/admin/drafts">
          Create Draft
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
                <div className="flex items-center justify-between w-full">
                  <div className="text-left">
                    <strong className="block text-sm leading-tight">{item.source_title}</strong>
                    <small className="text-xs text-slate-400">{item.category}</small>
                  </div>
                  <span className="ml-3 text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300 font-medium">{item.status}</span>
                </div>
              </button>
            ))
          ) : (
            <div className="brain-list-empty">
              <EmptyState
                icon="🧠"
                title={`No ${filter} items`}
                description="Run the AI agent to generate drafts for review, or select a different filter."
                actionLabel="Create Draft"
                actionHref="/admin/drafts"
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
                <button className="ghost-button" type="button" onClick={() => brainAction("approve")} disabled={actionPending}>
                  Approve
                </button>
                <button className="ghost-button danger" type="button" onClick={() => brainAction("reject")} disabled={actionPending}>
                  Reject
                </button>
                <button className="ghost-button" type="button" onClick={() => publish(false)} disabled={actionPending}>
                  Create CMS Draft
                </button>
                <button className="primary-button" type="button" onClick={() => publish(true)} disabled={actionPending}>
                  Publish
                </button>
                {selected.status === "published" && selected.is_public && selected.post_slug ? (
                  <button className="ghost-button danger" type="button" onClick={unpublish} disabled={actionPending}>
                    Unpublish
                  </button>
                ) : null}
              </div>
              <div className="draft-preview" dangerouslySetInnerHTML={{ __html: safeSelectedContent }} />
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
