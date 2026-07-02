"use client";

import Footer7 from "@/components/ui/footer-7";
import PageBackground from "@/components/PageBackground";

const features = [
  {
    icon: "📡",
    title: "Real-time Signal Tracking",
    description: "Monitor demand, shipments, and market signals as they change across your network.",
  },
  {
    icon: "🗺️",
    title: "Geospatial Map Integration",
    description: "See routes, inventory movement, and supply hotspots in a single visual command center.",
  },
  {
    icon: "⚠️",
    title: "AI-Powered Risk Alerts",
    description: "Get instant alerts on disruption patterns, delays, and emerging operational risks.",
  },
  {
    icon: "🤖",
    title: "Procurement Automation",
    description: "Automate supplier insights, sourcing readiness, and contract decision support.",
  },
  {
    icon: "🧠",
    title: "Daily Operational Briefs",
    description: "Turn fragmented updates into focused, executive-ready daily intelligence summaries.",
  },
  {
    icon: "🔌",
    title: "API Data Streams",
    description: "Connect your existing systems and bring clean operational data into one experience.",
  },
];

export default function FeaturesPage() {
  return (
    <PageBackground overlayOpacity={0.82}>
      <div className="min-h-screen px-4 py-24 text-slate-100">
        <div className="mx-auto flex max-w-7xl flex-col items-center">
          <div className="mb-14 max-w-3xl text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
              Platform capabilities
            </p>
            <h1 className="mb-5 text-4xl font-bold text-white md:text-5xl">
              One Control Surface for Your Entire Supply Chain
            </h1>
            <p className="text-lg text-slate-400">
              Unite operations, procurement, forecasting, and visibility in one calm, intelligent workspace.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-800/70 bg-slate-900/50 p-7 shadow-[0_0_30px_rgba(6,182,212,0.08)] backdrop-blur-xl"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-orange-500/20 text-2xl">
                  {feature.icon}
                </div>
                <h3 className="mb-3 text-xl font-semibold text-white">{feature.title}</h3>
                <p className="text-sm leading-7 text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
        <Footer7 />
      </div>
    </PageBackground>
  );
}
