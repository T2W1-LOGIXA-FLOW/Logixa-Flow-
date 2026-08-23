"use client";

import React, { useState, useEffect } from "react";
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

export default function FeedManager() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [scrapingId, setScrapingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    url: "",
    title: "",
    category: "Supply Chain",
    trust_level: "standard",
  });

  // Fetch feeds on mount
  useEffect(() => {
    fetchFeeds();
  }, []);

  const fetchFeeds = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAdminSessionToken();
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
      const token = getAdminSessionToken();
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
      const token = getAdminSessionToken();
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
      const token = getAdminSessionToken();
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

  if (loading) {
    return (
      <div className="space-y-4">
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
        actionOnClick={() => fetchFeeds()}
      />
    );
  }

  return (
    <div className="admin-panel">
      <div className="mb-6">
        <Button onClick={() => setShowAddForm(!showAddForm)} variant="default">
          {showAddForm ? "Cancel" : "Add New Feed"}
        </Button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddFeed} className="p-4 mb-6 rounded-xl bg-slate-900 border border-slate-800">

          <div className="mb-3">
            <label className="block mb-2 font-bold">Feed URL *</label>
            <Input
              type="url"
              placeholder="https://example.com/feed"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              required
            />
          </div>

          <div className="mb-3">
            <label className="block mb-2 font-bold">Title</label>
            <Input
              type="text"
              placeholder="Feed title (optional)"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="mb-3">
            <label className="block mb-2 font-bold">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full p-2 rounded border border-slate-700 bg-slate-900 text-slate-100"
            >
              <option value="Supply Chain">Supply Chain</option>
              <option value="Logistics">Logistics</option>
              <option value="Procurement">Procurement</option>
              <option value="Operations Excellence">Operations Excellence</option>
              <option value="News">News</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="block mb-2 font-bold">Trust Level</label>
            <select
              value={formData.trust_level}
              onChange={(e) => setFormData({ ...formData, trust_level: e.target.value })}
              className="w-full p-2 rounded border border-slate-700 bg-slate-900 text-slate-100"
            >
              <option value="standard">Standard</option>
              <option value="verified">Verified</option>
              <option value="high">High</option>
            </select>
          </div>

          <Button type="submit" variant="default">
            Add Feed
          </Button>
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
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-slate-700">
          <thead>
            <tr className="bg-slate-800 border-b border-slate-700">
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">URL</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Trust Level</th>
              <th className="px-4 py-3 text-left">Last Scrape</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {feeds.map((feed) => (
              <motion.tr
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                key={feed.id}
                style={{ borderBottom: "1px solid #ddd" }}
              >
                <td className="px-4 py-3">{feed.title || feed.url}</td>
                <td
                  style={{
                    maxWidth: 200,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <a
                    href={feed.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#0066cc" }}
                  >
                    {feed.url.substring(0, 40)}...
                  </a>
                </td>
                <td style={{ padding: 12 }}>{feed.category}</td>
                <td style={{ padding: 12 }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 8px",
                      backgroundColor:
                        feed.trust_level === "high"
                          ? "#e8f5e9"
                          : feed.trust_level === "verified"
                            ? "#e3f2fd"
                            : "#f5f5f5",
                      borderRadius: 4,
                      fontSize: 12,
                    }}
                  >
                    {feed.trust_level}
                  </span>
                </td>
                <td style={{ padding: 12, fontSize: 12 }}>
                  {feed.last_scrape_at
                    ? new Date(feed.last_scrape_at).toLocaleDateString()
                    : "Never"}
                </td>
                <td style={{ padding: 12, fontSize: 12 }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 8px",
                      backgroundColor:
                        feed.last_scrape_status === "done"
                          ? "#e8f5e9"
                          : feed.last_scrape_status === "scraping"
                            ? "#fff3e0"
                            : "#f5f5f5",
                      borderRadius: 4,
                    }}
                  >
                    {feed.last_scrape_status}
                  </span>
                </td>
                <td style={{ padding: 12, textAlign: "center" }}>
                  <Button
                    onClick={() => handleScrapeFeed(feed.id)}
                    disabled={scrapingId === feed.id}
                    variant="ghost"
                    style={{ marginRight: 8 }}
                  >
                    {scrapingId === feed.id ? "Scraping..." : "Scrape"}
                  </Button>
                  <Button
                    onClick={() => handleDeleteFeed(feed.id)}
                    variant="ghost"
                    style={{ color: "#c00" }}
                  >
                    Delete
                  </Button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
