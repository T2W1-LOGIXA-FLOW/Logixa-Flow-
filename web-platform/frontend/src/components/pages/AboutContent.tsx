"use client";

import PageBackground from "@/components/PageBackground";
import Footer from "@/components/Footer";
import { useLocale } from "@/lib/LanguageContext";

export default function AboutContent() {
  const { t } = useLocale();

  return (
    <PageBackground overlayOpacity={0.85}>
      <main className="relative min-h-screen py-16 md:py-20 overflow-hidden">
        <div className="relative z-10 mx-auto max-w-7xl px-4 lg:px-8">
        <div className="logixa-card page-heading mb-12 p-8 md:p-10">
          <p className="eyebrow">{t("aboutEyebrow")}</p>
          <h1>{t("aboutTitle")}</h1>
          <p>{t("aboutIntro")}</p>
        </div>

        <section className="feature-band mb-12">
          <div className="logixa-card feature-item p-6">
            <h3>{t("aboutMissionTitle")}</h3>
            <p>{t("aboutMissionBody")}</p>
          </div>
          <div className="logixa-card feature-item p-6">
            <h3>{t("aboutFocusTitle")}</h3>
            <div className="mt-3">
              {Array.isArray(t("aboutFocusBody")) ? (
                <ul className="space-y-2">
                  {t("aboutFocusBody").map((item: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-slate-300 text-base leading-relaxed">
                      <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2"></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-300 text-base leading-relaxed">{t("aboutFocusBody")}</p>
              )}
            </div>
          </div>
        </section>

        {/* AI Workflow Section */}
        <section className="mb-12">
          <div className="logixa-card p-6 md:p-8">
            <h2 className="text-2xl font-bold mb-6 text-white">AI-Powered Workflow</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-cyan-400 mb-2">Source Collection</h3>
                <p className="text-slate-300 text-sm">
                  Automated gathering of supply chain data from trusted Myanmar sources and logistics channels.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-orange-400 mb-2">Draft Generation</h3>
                <p className="text-slate-300 text-sm">
                  AI-powered analysis and synthesis of collected data into actionable intelligence reports.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-cyan-400 mb-2">Human Approval</h3>
                <p className="text-slate-300 text-sm">
                  Expert review and validation of AI-generated content before publication to ensure accuracy.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Model Section */}
        <section className="mb-12">
          <div className="logixa-card p-6 md:p-8">
            <h2 className="text-2xl font-bold mb-6 text-white">Trust & Quality Model</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-cyan-400 mb-2">Curated Sources</h3>
                  <p className="text-slate-300 text-sm">
                    All data sources are vetted and monitored for reliability, focusing on official Myanmar logistics channels and trusted industry partners.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-orange-400 mb-2">Review Gates</h3>
                  <p className="text-slate-300 text-sm">
                    Multi-stage review process ensures all intelligence passes through quality checks before reaching users.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-cyan-400 mb-2">Publication Control</h3>
                  <p className="text-slate-300 text-sm">
                    Controlled publication workflow with audit trails and approval hierarchies for sensitive supply chain information.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-orange-400 mb-2">Real-time Updates</h3>
                  <p className="text-slate-300 text-sm">
                    Continuous monitoring and rapid response to market changes, ensuring timely intelligence for decision-makers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Focus Areas Section */}
        <section className="mb-12">
          <div className="logixa-card p-6 md:p-8">
            <h2 className="text-2xl font-bold mb-6 text-white">Core Focus Areas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-cyan-400 mb-2">Logistics Intelligence</h3>
                <p className="text-slate-300 text-sm">
                  Real-time tracking of cargo movements, port operations, and transportation networks across Myanmar.
                </p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-orange-400 mb-2">Procurement Insights</h3>
                <p className="text-slate-300 text-sm">
                  Market analysis for sourcing decisions, supplier intelligence, and procurement optimization strategies.
                </p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-cyan-400 mb-2">Operations Analytics</h3>
                <p className="text-slate-300 text-sm">
                  Operational efficiency metrics, bottleneck identification, and process optimization recommendations.
                </p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-orange-400 mb-2">Market Signals</h3>
                <p className="text-slate-300 text-sm">
                  Early warning indicators, trend analysis, and predictive intelligence for Myanmar&apos;s supply chain landscape.
                </p>
              </div>
            </div>
          </div>
        </section>
        </div>
      </main>
      
      {/* Footer */}
      <div className="relative z-10 mt-16">
        <Footer />
      </div>
    </PageBackground>
  );
}
