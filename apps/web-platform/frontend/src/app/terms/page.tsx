import { Metadata } from "next";
import PageBackground from "@/components/PageBackground";

export const metadata: Metadata = {
  title: "Terms of Service | Logixa Flow",
  description: "Terms for using Logixa Flow public pages, admin tools, and AI-assisted workflows.",
  openGraph: {
    title: "Terms of Service",
    description: "Logixa Flow Terms of Service",
  },
};

const sections = [
  {
    title: "1. Acceptance",
    body: [
      "By accessing Logixa Flow, you agree to these Terms of Service. If you do not agree, do not use the website, admin workspace, API, or AI-assisted features.",
      "Some features may be available only to administrators or approved beta users.",
    ],
  },
  {
    title: "2. Service Scope",
    body: [
      "Logixa Flow provides supply chain intelligence pages, content management tools, AI-assisted draft workflows, source intake, analytics, estimators, and related operational features.",
      "The product is designed to support business research and decision workflows. It does not replace professional, legal, financial, logistics, customs, or procurement advice.",
    ],
  },
  {
    title: "3. Beta and Availability",
    body: [
      "Beta features may change, pause, fail, or be removed. Free hosting and third-party services may introduce cold starts, rate limits, storage limits, provider downtime, or queue delays.",
      "We may update features, design, integrations, and data models as the product improves.",
    ],
  },
  {
    title: "4. Accounts and Admin Access",
    body: [
      "Administrators are responsible for keeping passwords, API keys, JWT secrets, deployment settings, and access tokens secure. Do not share admin credentials with unauthorized users.",
      "We may restrict or revoke access if activity creates security, legal, abuse, or operational risk.",
    ],
  },
  {
    title: "5. Content and Uploads",
    body: [
      "You are responsible for content, files, source notes, prompts, and other material submitted to the service. You must have the rights needed to submit and use that material.",
      "Do not upload unlawful, harmful, infringing, confidential third-party, or malware-related content.",
    ],
  },
  {
    title: "6. AI Output",
    body: [
      "AI-generated output may be inaccurate, incomplete, outdated, or unsuitable for publication. Admin review is required before using AI output in business decisions or public content.",
      "You remain responsible for fact-checking, editing, approving, and publishing content created with AI assistance.",
    ],
  },
  {
    title: "7. Payments and Integrations",
    body: [
      "Payment, email, storage, database, cache, and AI integrations may be provided by third parties. Their own terms and policies apply to those services.",
      "Costs from third-party providers are the responsibility of the account or organization that enables them.",
    ],
  },
  {
    title: "8. Acceptable Use",
    body: [
      "Do not use Logixa Flow to attack systems, scrape unlawfully, spam users, bypass security controls, misrepresent content, violate privacy rights, or process information you are not allowed to use.",
    ],
  },
  {
    title: "9. Intellectual Property",
    body: [
      "Logixa Flow, its interface, brand elements, and platform code are protected by intellectual property laws. User-submitted content remains subject to the rights held by the user or original owner.",
    ],
  },
  {
    title: "10. Disclaimers and Liability",
    body: [
      "The service is provided as is and as available. To the fullest extent allowed by law, Logixa Flow disclaims implied warranties and is not liable for indirect, incidental, special, consequential, or lost-profit damages from use of the service.",
    ],
  },
  {
    title: "11. Changes and Contact",
    body: [
      "We may revise these terms as the service evolves. Questions about these terms can be sent to legal@logixaflow.com.",
    ],
  },
];

export default function TermsPage() {
  return (
    <PageBackground overlayOpacity={0.85}>
      <div className="min-h-screen text-slate-100">
        <div className="mx-auto max-w-4xl px-4 py-16 md:py-24">
          <div className="rounded-lg border border-cyan-400/20 bg-slate-950/70 p-6 shadow-2xl shadow-cyan-950/20 md:p-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Logixa Flow Terms</p>
            <h1 className="bg-gradient-to-r from-cyan-400 to-orange-400 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
              Terms of Service
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">Last updated: August 10, 2026</p>
          </div>

          <div className="mt-8 space-y-5">
            {sections.map((section) => (
              <section
                key={section.title}
                className="rounded-lg border border-cyan-400/15 bg-slate-950/65 p-5 shadow-xl shadow-slate-950/30"
              >
                <h2 className="mb-3 text-xl font-bold text-white">{section.title}</h2>
                <div className="space-y-3 text-sm leading-7 text-slate-300">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </PageBackground>
  );
}
