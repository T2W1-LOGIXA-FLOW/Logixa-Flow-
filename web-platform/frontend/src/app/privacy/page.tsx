import { Metadata } from "next";
import PageBackground from "@/components/PageBackground";

export const metadata: Metadata = {
  title: "Privacy Policy | Logixa Flow",
  description: "How Logixa Flow handles account, contact, content, analytics, and AI feature data.",
  openGraph: {
    title: "Privacy Policy",
    description: "Logixa Flow Privacy Policy",
  },
};

const sections = [
  {
    title: "1. Overview",
    body: [
      "Logixa Flow provides supply chain intelligence, content workflows, admin tools, and AI-assisted operations features. This policy explains what information we collect, how we use it, and the choices available to users and administrators.",
      "This policy is written for the Logixa Flow beta service. It is not a substitute for legal advice, and production launches should be reviewed against the laws that apply to your users and business.",
    ],
  },
  {
    title: "2. Information We Collect",
    body: [
      "We may collect contact details submitted through forms, newsletter subscriptions, admin account details, uploaded media, support messages, usage events, device and browser data, and content created or reviewed inside the admin workspace.",
      "When AI features are used, prompts, source notes, draft content, and related context may be processed so the service can generate, summarize, classify, or review supply chain intelligence.",
    ],
  },
  {
    title: "3. How We Use Information",
    body: [
      "We use information to operate the website, authenticate administrators, publish and manage insights, respond to contact requests, improve reliability, prevent abuse, monitor service health, and provide AI-assisted workflow features.",
      "We may also use aggregated or de-identified operational data to understand product performance and improve the service.",
    ],
  },
  {
    title: "4. AI Features",
    body: [
      "AI features may send prompts and context to configured AI providers such as Gemini, OpenRouter, Groq, or other services enabled by the administrator. Secret values are not intentionally exposed in the admin status views.",
      "Users and administrators should avoid submitting passwords, private keys, payment data, or confidential third-party information into AI prompts unless the relevant provider and data handling terms have been reviewed.",
    ],
  },
  {
    title: "5. Service Providers",
    body: [
      "The service may rely on hosting, database, object storage, cache, analytics, email, payment, and AI providers. Examples include Vercel, Render or another API host, Supabase, Cloudflare R2, Upstash, and configured AI providers.",
      "These providers process information only as needed to support the service features that are enabled.",
    ],
  },
  {
    title: "6. Cookies and Local Storage",
    body: [
      "We may use cookies, browser storage, and similar technologies for authentication, preferences, security, analytics, and feature behavior. Disabling cookies may prevent some parts of the service from working correctly.",
    ],
  },
  {
    title: "7. Retention and Security",
    body: [
      "We keep information only as long as needed for the service, legal obligations, operational records, or security purposes. Administrators can remove or update published content and drafts through the management workflow.",
      "We use reasonable technical and organizational measures to protect data, but no internet service can guarantee absolute security.",
    ],
  },
  {
    title: "8. Your Choices",
    body: [
      "Depending on your location, you may request access, correction, deletion, restriction, export, or withdrawal from marketing messages. We may need to verify your request before acting on it.",
    ],
  },
  {
    title: "9. Children",
    body: [
      "Logixa Flow is intended for business and professional use. We do not knowingly collect personal information from children under 18.",
    ],
  },
  {
    title: "10. Contact",
    body: [
      "Questions about this policy can be sent to privacy@logixaflow.com.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <PageBackground overlayOpacity={0.85}>
      <div className="min-h-screen text-slate-100">
        <div className="mx-auto max-w-4xl px-4 py-16 md:py-24">
          <div className="rounded-lg border border-cyan-400/20 bg-slate-950/70 p-6 shadow-2xl shadow-cyan-950/20 md:p-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Logixa Flow Policy</p>
            <h1 className="bg-gradient-to-r from-cyan-400 to-orange-400 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
              Privacy Policy
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
