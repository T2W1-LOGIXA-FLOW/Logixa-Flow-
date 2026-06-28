import Link from "next/link";

const hubItems = [
  {
    title: "Procurement Playbooks",
    description: "Supplier risk, sourcing notes, and negotiation prompts.",
    href: "/blog?category=Procurement",
  },
  {
    title: "Logistics Control Notes",
    description: "Port congestion, customs signals, and recovery actions.",
    href: "/blog?category=Logistics",
  },
  {
    title: "Operations Briefs",
    description: "Executive-ready checklists for daily flow decisions.",
    href: "/blog?category=Operations%20Excellence",
  },
];

export default function HomeKnowledgeStrip() {
  return (
    <section className="section-shell">
      <div className="rounded-2xl border border-[#222222] bg-[#101010]/80 p-5 shadow-[0_0_42px_rgba(0,163,255,0.08)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">Knowledge Hub</p>
            <h2 className="mt-2 font-heading text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Practical SCM playbooks, without leaving the flow.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-400 sm:text-base">
              A compact premium layer for turning insights into procurement,
              logistics, and operations actions.
            </p>
          </div>
          <Link
            className="inline-flex w-fit items-center rounded-lg border border-[#222222] px-5 py-3 text-sm font-bold text-gray-300 transition-all duration-300 hover:border-[#00A3FF] hover:text-white hover:shadow-[0_0_18px_rgba(0,163,255,0.18)]"
            href="/blog"
          >
            Browse Insights
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {hubItems.map((item) => (
            <Link
              className="group rounded-xl border border-[#222222] bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#00A3FF] hover:bg-white/[0.05]"
              href={item.href}
              key={item.title}
            >
              <span className="block h-1 w-10 rounded-full bg-gradient-to-r from-[#00A3FF] to-[#FF6B00] opacity-70 transition-all duration-300 group-hover:w-16 group-hover:opacity-100" />
              <h3 className="mt-4 font-heading text-lg font-bold leading-snug text-white">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">
                {item.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
