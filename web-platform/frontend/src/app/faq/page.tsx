"use client";

import { useState } from "react";
import PageBackground from "@/components/PageBackground";

const faqs = [
  {
    question: "What data sources does Logixa Flow use?",
    answer:
      "Logixa Flow brings together shipment feeds, ERP data, procurement signals, market intelligence, and operational updates into one unified view.",
  },
  {
    question: "How frequently is the data updated?",
    answer:
      "Data refresh frequency depends on your connected sources, but most live integrations update continuously or at regular intervals throughout the day.",
  },
  {
    question: "Is my business data secure?",
    answer:
      "Yes. We apply access controls, encrypted transport, and secure data handling practices for sensitive operational information.",
  },
  {
    question: "Can I integrate this with my existing ERP?",
    answer:
      "Absolutely. Logixa Flow is designed to connect with common ERP, procurement, and operational systems through APIs and structured integrations.",
  },
  {
    question: "Do I need technical skills to use the dashboard?",
    answer:
      "No. The interface is built for business and operations teams, with simple navigation and clear views for day-to-day decision making.",
  },
  {
    question: "How do I contact customer support?",
    answer:
      "You can contact support through the contact page or by reaching out to your account team for onboarding and implementation help.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <PageBackground overlayOpacity={0.15}>
      <div className="min-h-screen px-4 py-24 text-slate-100">
        <div className="mx-auto flex max-w-5xl flex-col items-center">
          <div className="mb-14 max-w-3xl text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
              Help center
            </p>
            <h1 className="mb-5 text-4xl font-bold text-white md:text-5xl">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-slate-400">
              Everything teams usually want to know before moving into daily operations with Logixa Flow.
            </p>
          </div>

          <div className="w-full space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={faq.question}
                  className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/45 backdrop-blur-xl"
                >
                  <button
                    className="flex w-full items-center justify-between px-6 py-5 text-left"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                  >
                    <span className="text-lg font-semibold text-white">{faq.question}</span>
                    <span className="text-2xl text-cyan-400">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && <p className="px-6 pb-6 text-sm leading-7 text-slate-400">{faq.answer}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PageBackground>
  );
}
