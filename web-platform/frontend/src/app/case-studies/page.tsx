"use client";

import PageBackground from "@/components/PageBackground";

const stories = [
  {
    company: "Myanmar Logistics Co.",
    summary:
      "Their regional network was split across spreadsheets and late updates, creating costly delays in shipment decisions.",
    result: "Reduced operational costs by 15% and improved exception response time by 40%.",
  },
  {
    company: "Northstar Importers",
    summary:
      "They needed a clearer view of supplier risk and route volatility while scaling procurement coverage across borders.",
    result: "Improved supplier visibility and cut reactive planning work by nearly half.",
  },
  {
    company: "BlueHarbor Distribution",
    summary:
      "Their team struggled to combine demand signals and inventory context into one dependable operating view.",
    result: "Unlocked stronger daily execution and reduced stock mismatch surprises across key hubs.",
  },
];

export default function CaseStudiesPage() {
  return (
    <PageBackground overlayOpacity={0.15}>
      <div className="min-h-screen px-4 py-24 text-slate-100">
        <div className="mx-auto flex max-w-7xl flex-col items-center">
          <div className="mb-14 max-w-3xl text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
              Success stories
            </p>
            <h1 className="mb-5 text-4xl font-bold text-white md:text-5xl">
              How Businesses Are Winning with Logixa Flow
            </h1>
            <p className="text-lg text-slate-400">
              Real-world scenarios showing how teams gain clarity, speed, and better control with Logixa Flow.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-3">
            {stories.map((story) => (
              <div
                key={story.company}
                className="rounded-2xl border border-slate-800/70 bg-slate-900/45 p-7 shadow-[0_0_30px_rgba(249,115,22,0.08)] backdrop-blur-xl"
              >
                <div className="mb-4 inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
                  {story.company}
                </div>
                <p className="mb-4 text-sm leading-7 text-slate-300">{story.summary}</p>
                <div className="mb-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200">
                  <span className="font-semibold text-cyan-300">Result:</span> {story.result}
                </div>
                <button className="text-sm font-semibold text-orange-400 transition hover:text-orange-300">
                  Read Full Case Study →
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageBackground>
  );
}
