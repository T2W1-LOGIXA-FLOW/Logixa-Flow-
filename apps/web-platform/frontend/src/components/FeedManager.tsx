"use client";

import React, { useEffect, useMemo, useState } from "react";
import Button from "@/components/shadcn/Button";
import Input from "@/components/shadcn/Input";
import Skeleton from "@/components/shadcn/Skeleton";
import { toast } from "sonner";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import { motion } from "framer-motion";
import { adminFetch } from "@/components/api";
import { getAdminSessionToken } from "@/lib/adminSession";

interface Feed {
  id: number;
  url: string;
  title: string;
  category: string;
  trust_level: string;
  is_active: boolean;
  last_scrape_at: string | null;
  last_scrape_status: string;
  scrape_count: number;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function FeedManager() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [scrapingId, setScrapingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formData, setFormData] = useState({
    url: "",
    title: "",
    category: "Supply Chain",
    trust_level: "standard",
  });

  useEffect(() => {
    void fetchFeeds();
  }, []);

  const fetchFeeds = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAdminSessionToken();
      if (!token) throw new Error("Admin login required");
      const response = await adminFetch("/api/admin/integration/feeds", token);
      if (!response.ok) throw new Error("Failed to fetch feeds");
      const data = await response.json();
      setFeeds(data.feeds || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching feeds");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.url.trim()) {
      toast.error("Feed URL is required");
      return;
    }

    try {
      const token = await getAdminSessionToken();
      if (!token) throw new Error("Admin login required");
      const response = await adminFetch("/api/admin/integration/feeds", token, {
        method: "POST",
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to add feed");
      }

      toast.success("Feed added successfully");
      setFormData({ url: "", title: "", category: "Supply Chain", trust_level: "standard" });
      setShowAddForm(false);
      await fetchFeeds();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error adding feed");
    }
  };

  const handleDeleteFeed = async (feedId: number) => {
    if (!confirm("Are you sure you want to delete this feed?")) return;

    setError(null);
    try {
      const token = await getAdminSessionToken();
      if (!token) throw new Error("Admin login required");
      const response = await adminFetch(`/api/admin/integration/feeds/${feedId}`, token, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete feed");

      toast.success("Feed deleted successfully");
      await fetchFeeds();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error deleting feed");
    }
  };

  const handleScrapeFeed = async (feedId: number) => {
    setScrapingId(feedId);
    setError(null);
    toast.info("Scrape started...");

    try {
      const token = await getAdminSessionToken();
      if (!token) throw new Error("Admin login required");
      const response = await adminFetch(`/api/admin/integration/feeds/${feedId}/scrape`, token, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to scrape feed");

      const data = await response.json();
      toast.success(`Scrape complete - imported ${data.imported} items`);
      await fetchFeeds();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error scraping feed");
    } finally {
      setScrapingId(null);
    }
  };

  const categories = useMemo(
    () => Array.from(new Set(feeds.map((feed) => feed.category).filter(Boolean))).sort(),
    [feeds],
  );
  const filteredFeeds = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return feeds.filter((feed) => {
      const matchesSearch =
        !normalizedSearch ||
        [feed.title, feed.url, feed.category, feed.trust_level, feed.last_scrape_status]
          .some((value) => (value || "").toLowerCase().includes(normalizedSearch));
      const matchesCategory = categoryFilter === "all" || feed.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [feeds, search, categoryFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredFeeds.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageFeeds = filteredFeeds.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (loading) {
    return (
      <div className="min-w-0 space-y-4">
        <Skeleton className="h-10 w-32" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <ErrorState
        title="Could not load feeds"
        description={error}
        actionLabel="Retry"
        actionOnClick={() => void fetchFeeds()}
      />
    );
  }

  return (
    <div className="admin-panel w-full min-w-0 max-w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div className="w-full min-w-[12rem] flex-1 sm:max-w-sm">
            <Input
              type="search"
              aria-label="Search feeds"
              placeholder="Search feeds by title, URL, or category"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <span>Category</span>
            <select
              aria-label="Filter feeds by category"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="min-h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-slate-100"
            >
              <option value="all">All categories</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} variant="default">
          {showAddForm ? "Cancel" : "Add New Feed"}
        </Button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddFeed} className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="mb-3">
            <label className="mb-2 block font-bold">Feed URL *</label>
            <Input
              type="url"
              placeholder="https://example.com/feed"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              required
            />
          </div>
          <div className="mb-3">
            <label className="mb-2 block font-bold">Title</label>
            <Input
              type="text"
              placeholder="Feed title (optional)"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div className="mb-3">
            <label className="mb-2 block font-bold">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-slate-100"
            >
              <option value="Supply Chain">Supply Chain</option>
              <option value="Logistics">Logistics</option>
              <option value="Procurement">Procurement</option>
              <option value="Operations Excellence">Operations Excellence</option>
              <option value="News">News</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="mb-2 block font-bold">Trust Level</label>
            <select
              value={formData.trust_level}
              onChange={(e) => setFormData({ ...formData, trust_level: e.target.value })}
              className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-slate-100"
            >
              <option value="standard">Standard</option>
              <option value="verified">Verified</option>
              <option value="high">High</option>
            </select>
          </div>
          <Button type="submit" variant="default">Add Feed</Button>
        </form>
      )}

      {feeds.length === 0 ? (
        <EmptyState
          icon="📡"
          title="No feeds yet"
          description="Add your first RSS feed to start collecting intelligence."
          actionLabel={showAddForm ? undefined : "Add Feed"}
          actionOnClick={() => setShowAddForm(true)}
        />
      ) : filteredFeeds.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <p className="font-medium text-slate-100">No feeds match your filters.</p>
          <p className="mt-1 text-sm text-slate-400">Change the search term or category filter.</p>
          <button
            type="button"
            onClick={() => { setSearch(""); setCategoryFilter("all"); setPage(1); }}
            className="mt-3 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-slate-700">
            <table className="w-full min-w-[960px] table-fixed border-collapse text-sm">
              <colgroup>
                <col style={{ width: "20%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800">
                  <th scope="col" className="px-3 py-3 text-left">Title</th>
                  <th scope="col" className="px-3 py-3 text-left">URL</th>
                  <th scope="col" className="px-3 py-3 text-left">Category</th>
                  <th scope="col" className="px-3 py-3 text-left">Trust Level</th>
                  <th scope="col" className="px-3 py-3 text-left">Last Scrape</th>
                  <th scope="col" className="px-3 py-3 text-left">Status</th>
                  <th scope="col" className="whitespace-nowrap px-3 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageFeeds.map((feed) => {
                  const trustLevel = feed.trust_level?.trim() || "standard";
                  const scrapeStatus = feed.last_scrape_status?.trim() || "not scraped";
                  return (
                    <motion.tr
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      key={feed.id}
                      className="border-b border-slate-800 last:border-0"
                    >
                      <td className="max-w-0 px-3 py-3">
                        <span className="block truncate font-medium text-slate-100" title={feed.title || feed.url}>
                          {feed.title || feed.url}
                        </span>
                      </td>
                      <td className="max-w-0 px-3 py-3">
                        <a
                          href={feed.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={feed.url}
                          className="block truncate text-cyan-300 underline-offset-2 hover:underline"
                        >
                          {feed.url}
                        </a>
                      </td>
                      <td className="break-words px-3 py-3 text-slate-300">{feed.category || "Uncategorized"}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex max-w-full rounded-full border border-slate-600 bg-slate-800 px-2 py-1 text-xs capitalize text-slate-200">
                          {trustLevel}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-300">
                        {feed.last_scrape_at ? new Date(feed.last_scrape_at).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex max-w-full rounded-full border border-slate-600 bg-slate-800 px-2 py-1 text-xs capitalize text-slate-200">
                          {scrapeStatus}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          <Button
                            onClick={() => void handleScrapeFeed(feed.id)}
                            disabled={scrapingId === feed.id}
                            variant="ghost"
                            aria-label={`Scrape ${feed.title || feed.url}`}
                          >
                            {scrapingId === feed.id ? "Scraping…" : "Scrape"}
                          </Button>
                          <Button
                            onClick={() => void handleDeleteFeed(feed.id)}
                            variant="ghost"
                            aria-label={`Delete ${feed.title || feed.url}`}
                            style={{ color: "#fca5a5" }}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
            <p aria-live="polite">
              Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredFeeds.length)} of {filteredFeeds.length} feeds
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2">
                <span>Rows</span>
                <select
                  aria-label="Rows per page"
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="min-h-9 rounded border border-slate-700 bg-slate-900 px-2 text-slate-100"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setPage(Math.max(1, safePage - 1))}
                disabled={safePage <= 1}
                className="rounded border border-slate-700 px-3 py-1.5 text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="tabular-nums">Page {safePage} of {pageCount}</span>
              <button
                type="button"
                onClick={() => setPage(Math.min(pageCount, safePage + 1))}
                disabled={safePage >= pageCount}
                className="rounded border border-slate-700 px-3 py-1.5 text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
