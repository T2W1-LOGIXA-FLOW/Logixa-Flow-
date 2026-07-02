"use client";

import ContactForm from "@/components/ContactForm";
import PageBackground from "@/components/PageBackground";
import Footer from "@/components/Footer";
import { useLocale } from "@/lib/LanguageContext";

export default function ContactContent() {
  const { t } = useLocale();
  const contactNotes = [
    {
      label: "Best for",
      value: "Procurement planning, logistics workflows, and platform integrations.",
    },
    {
      label: "Response flow",
      value: "Your request is routed as a structured inquiry so the team can review context before replying.",
    },
    {
      label: "Private admin",
      value: "Admin tools stay outside the public navigation and are accessed through a separate direct route.",
    },
  ];

  return (
    <PageBackground overlayOpacity={0.85}>
      <main className="relative min-h-screen overflow-hidden py-16 md:py-20">
        <div className="relative z-10 mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="logixa-card p-6 md:p-8 space-y-6">
              <div>
                <p className="eyebrow mb-4">{t("contactEyebrow")}</p>
                <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
                  {t("contactTitle")}
                </h1>
                <p className="text-slate-300 text-base md:text-lg leading-relaxed">
                  {t("contactIntro")}
                </p>
              </div>
              <div className="grid gap-4 pt-2">
                {contactNotes.map((note) => (
                  <div
                    key={note.label}
                    className="rounded-lg border border-cyan-500/15 bg-slate-950/35 p-5"
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">
                      {note.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {note.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="logixa-card p-6 md:p-8">
              <ContactForm />
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <div className="relative z-10 mt-16">
        <Footer />
      </div>
    </PageBackground>
  );
}
