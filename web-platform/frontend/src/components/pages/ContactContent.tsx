"use client";

import ContactForm from "@/components/ContactForm";
import PageBackground from "@/components/PageBackground";
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
    <PageBackground overlayOpacity={0.88} brightness={1.1}>
      <main className="min-h-screen px-4 py-8 text-white sm:px-6 sm:py-10 lg:px-8">
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
            <div className="logixa-card flex min-h-[520px] flex-col justify-between space-y-8 p-6 sm:p-8 md:p-10">
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
                    className="rounded-lg border border-cyan-500/15 bg-slate-950/40 p-5"
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
            <div className="logixa-card min-h-[520px] p-6 sm:p-8 md:p-10">
              <ContactForm />
            </div>
          </div>
        </div>
      </main>
    </PageBackground>
  );
}
