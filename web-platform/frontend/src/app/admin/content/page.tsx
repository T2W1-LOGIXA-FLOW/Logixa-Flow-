import Link from "next/link";

export default function AdminContentPage() {
  return (
    <main className="page-shell">
      <section className="agent-header">
        <div>
          <p className="eyebrow">Content</p>
          <h1>Content Management</h1>
          <p className="muted">Review insights, drafts, and published articles from the admin command center.</p>
        </div>
      </section>

      <div className="admin-panel max-w-4xl space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/admin/insights" className="rounded-2xl border border-cyan-500/20 bg-slate-900 p-4 text-left hover:border-cyan-400/40">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Insights</p>
            <p className="mt-2 text-lg font-semibold text-white">Review insight queue</p>
          </Link>
          <Link href="/admin/drafts" className="rounded-2xl border border-violet-500/20 bg-slate-900 p-4 text-left hover:border-violet-400/40">
            <p className="text-xs uppercase tracking-[0.2em] text-violet-300">Drafts</p>
            <p className="mt-2 text-lg font-semibold text-white">Open drafting board</p>
          </Link>
          <Link href="/admin/articles" className="rounded-2xl border border-amber-500/20 bg-slate-900 p-4 text-left hover:border-amber-400/40">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-300">Articles</p>
            <p className="mt-2 text-lg font-semibold text-white">Manage published content</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
