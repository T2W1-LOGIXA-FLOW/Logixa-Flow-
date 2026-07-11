"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import AgentThinkingPanel from "@/components/AgentThinkingPanel";
import FeedbackRating from "@/components/FeedbackRating";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import Skeleton from "@/components/shadcn/Skeleton";
import Citations, { type Match } from "@/components/Citations";
import { AgentRun, IntelligenceSource, Post, adminFetch } from "@/components/api";
import Footer from "@/components/Footer";
import PageBackground from "@/components/PageBackground";

const categories: Post["category"][] = ["Supply Chain", "Logistics", "Procurement", "Operations Excellence", "News"];

export default function AgentControlCenter() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("Generate a Myanmar-ready supply chain risk brief for admin preview.");
  const [sources, setSources] = useState<IntelligenceSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<number>>(new Set());
  const [run, setRun] = useState<AgentRun | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [sourceForm, setSourceForm] = useState({
    title: "",
    url: "",
    category: "Supply Chain" as Post["category"],
    trust_level: "standard" as IntelligenceSource["trust_level"],
    notes: "",
  });
  const [rssForm, setRssForm] = useState({
    feed_url: "",
    category: "Supply Chain" as Post["category"],
    trust_level: "standard" as IntelligenceSource["trust_level"],
  });

  useEffect(() => {
    const saved = localStorage.getItem("adminToken") || localStorage.getItem("logixa_token");
    if (!saved) {
      router.push("/login");
      return;
    }
    setToken(saved);
    setSourcesLoading(true);
    setSourcesError(null);
    adminFetch("/api/admin/sources", saved)
      .then((response) => response.json())
      .then((records: IntelligenceSource[]) => {
        setSources(records);
        setSourcesLoading(false);
      })
      .catch(() => {
        setSourcesError("Failed to load sources. Please try again.");
        setSourcesLoading(false);
        toast.error("Sources could not be loaded.");
      });
  }, [router]);

  async function createSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sourceForm.title.trim()) {
      toast.error("Source title is required.");
      return;
    }
    try {
      const response = await adminFetch("/api/admin/sources", token, {
        method: "POST",
        body: JSON.stringify({
          ...sourceForm,
          url: sourceForm.url.trim() || null,
          source_type: sourceForm.url.trim() ? "url" : "manual",
        }),
      });
      const source = (await response.json()) as IntelligenceSource;
      setSources((current) => [source, ...current]);
      setSelectedSourceIds((current) => new Set(current).add(source.id));
      setSourceForm({ title: "", url: "", category: "Supply Chain", trust_level: "standard", notes: "" });
      toast.success("Source saved and selected.");
    } catch {
      toast.error("Failed to save source. Please try again.");
    }
  }

  function toggleSource(id: number) {
    setSelectedSourceIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function runAgent() {
    setIsRunning(true);
    const loadingToast = toast.loading("Agent run started…");
    setMatches([]);
    try {
      const response = await adminFetch("/api/agent/run", token, {
        method: "POST",
        body: JSON.stringify({ message, source_ids: Array.from(selectedSourceIds) }),
      });
      const data = (await response.json()) as AgentRun;
      setRun(data);
      toast.success("Agent run complete — draft is in the preview queue.", { id: loadingToast });
      // fetch RAG matches so we can show citations
      try {
        const r = await adminFetch(`/api/admin/rag/search?q=${encodeURIComponent(message)}&top_k=6`, token);
        const j = await r.json();
        setMatches(j.matches || []);
      } catch {
        // ignore citation fetch failures
      }
    } catch {
      toast.error("Agent run failed. Check backend logs or API key settings.", { id: loadingToast });
    } finally {
      setIsRunning(false);
    }
  }

  async function importRss(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const response = await adminFetch("/api/admin/sources/fetch-rss", token, {
        method: "POST",
        body: JSON.stringify({ ...rssForm, limit: 8 }),
      });
      const result = (await response.json()) as { imported: number; skipped: number };
      const refreshed = await adminFetch("/api/admin/sources", token);
      setSources((await refreshed.json()) as IntelligenceSource[]);
      toast.success(`RSS import complete. Imported ${result.imported}, skipped ${result.skipped}.`);
    } catch {
      toast.error("RSS import failed. Check the feed URL.");
    }
  }

  if (!token) {
    return (
      <PageBackground overlayOpacity={0.85}>
        <main className="page-shell agent-workspace">
        <div className="space-y-6 max-w-4xl mx-auto py-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2 w-3/4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-8 w-1/3" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </main>
      </PageBackground>
    );
  }

  return (
    <PageBackground overlayOpacity={0.85}>
      <main className="page-shell agent-workspace min-h-screen">
      <section className="agent-header">
        <div>
          <p className="eyebrow">AI Agent</p>
          <h1>Logixa Brain Control</h1>
          <p className="muted">Collect sources, run a grounded draft, and hold output in preview until admin review.</p>
        </div>
        <Link className="ghost-button" href="/admin/brain">
          Review Queue
        </Link>
      </section>

      <section className="agent-grid">
        <form className="admin-panel agent-source-form" onSubmit={createSource}>
          <p className="eyebrow">Source Intake</p>
          <h2>Add source</h2>
          <label>
            Title
            <input value={sourceForm.title} onChange={(event) => setSourceForm((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label>
            URL
            <input value={sourceForm.url} onChange={(event) => setSourceForm((current) => ({ ...current, url: event.target.value }))} />
          </label>
          <label>
            Category
            <select value={sourceForm.category} onChange={(event) => setSourceForm((current) => ({ ...current, category: event.target.value as Post["category"] }))}>
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label>
            Trust
            <select value={sourceForm.trust_level} onChange={(event) => setSourceForm((current) => ({ ...current, trust_level: event.target.value as IntelligenceSource["trust_level"] }))}>
              <option value="standard">standard</option>
              <option value="verified">verified</option>
              <option value="high">high</option>
            </select>
          </label>
          <label>
            Notes
            <textarea value={sourceForm.notes} onChange={(event) => setSourceForm((current) => ({ ...current, notes: event.target.value }))} />
          </label>
          <button className="primary-button" type="submit">
            Save Source
          </button>
        </form>

        <section className="admin-panel agent-run-panel">
          <p className="eyebrow">Private Draft Generator</p>
          <h2>Run agent</h2>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} />
          <div className="source-picker">
            {sourcesError ? (
              <ErrorState
                title="Failed to load sources"
                description={sourcesError}
                actionLabel="Retry"
                actionOnClick={() => {
                  setSourcesError(null);
                  setSourcesLoading(true);
                  adminFetch("/api/admin/sources", token)
                    .then((response) => response.json())
                    .then((records: IntelligenceSource[]) => {
                      setSources(records);
                      setSourcesLoading(false);
                    })
                    .catch(() => {
                      setSourcesError("Failed to load sources. Please try again.");
                      setSourcesLoading(false);
                      toast.error("Sources could not be loaded.");
                    });
                }}
              />
            ) : sourcesLoading ? (
              <div className="source-picker-empty">
                <Skeleton className="h-16 w-full mb-2" />
                <Skeleton className="h-16 w-full mb-2" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : sources.length ? (
              sources.map((source) => (
                <button className={selectedSourceIds.has(source.id) ? "active" : ""} key={source.id} type="button" onClick={() => toggleSource(source.id)}>
                  <span>{source.category}</span>
                  <strong>{source.title}</strong>
                </button>
              ))
            ) : (
              <div className="source-picker-empty">
                <EmptyState
                  icon="📚"
                  title="No sources yet"
                  description="Add a source to ground the agent with context, or run with the prompt only."
                  actionLabel="Add Source"
                  actionOnClick={() => {
                    const form = document.querySelector(".agent-source-form") as HTMLElement;
                    form?.scrollIntoView({ behavior: "smooth" });
                  }}
                />
              </div>
            )}
          </div>
          <button className="primary-button" disabled={isRunning} type="button" onClick={runAgent}>
            {isRunning ? "Running..." : "Run Agent"}
          </button>
        </section>
      </section>

      <form className="admin-panel rss-import-panel" onSubmit={importRss}>
        <p className="eyebrow">RSS Intake</p>
        <h2>Import feed sources</h2>
        <div className="rss-import-grid">
          <label>
            Feed URL
            <input value={rssForm.feed_url} onChange={(event) => setRssForm((current) => ({ ...current, feed_url: event.target.value }))} />
          </label>
          <label>
            Category
            <select value={rssForm.category} onChange={(event) => setRssForm((current) => ({ ...current, category: event.target.value as Post["category"] }))}>
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label>
            Trust
            <select value={rssForm.trust_level} onChange={(event) => setRssForm((current) => ({ ...current, trust_level: event.target.value as IntelligenceSource["trust_level"] }))}>
              <option value="standard">standard</option>
              <option value="verified">verified</option>
              <option value="high">high</option>
            </select>
          </label>
          <button className="primary-button" type="submit">
            Import RSS
          </button>
        </div>
      </form>

      <section className="admin-panel">
        <p className="eyebrow">Agent Trace</p>
        <h2>Reasoning timeline</h2>
        {run ? (
          <AgentThinkingPanel steps={run.steps || []} />
        ) : (
          <EmptyState
            icon="🤖"
            title="No agent runs yet"
            description="Run the agent above to generate a grounded draft and see the reasoning timeline here."
          />
        )}
      </section>

      {run?.memory ? (
        <section className="admin-panel preview-draft-panel">
          <p className="eyebrow">Preview Only</p>
          <h2>{run.memory.source_title}</h2>
          <p className="muted">{run.memory.summary}</p>
          <div className="draft-preview" dangerouslySetInnerHTML={{ __html: run.memory.content }} />
          <Citations matches={matches} sources={sources} />
          {run.id && token && (
            <FeedbackRating runId={run.id} token={token} />
          )}
        </section>
      ) : null}
    </main>
    <Footer />
    </PageBackground>
  );
}
