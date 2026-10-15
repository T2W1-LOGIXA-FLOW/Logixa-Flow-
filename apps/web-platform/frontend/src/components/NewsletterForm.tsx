"use client";

import { FormEvent, useState } from "react";

import { subscribe } from "./api";
import { useLocale } from "@/lib/LanguageContext";

export default function NewsletterForm() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    try {
      await subscribe(email);
      setEmail("");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="newsletter-panel" onSubmit={onSubmit}>
      <p className="eyebrow">{t("weeklySignals")}</p>
      <h2>{t("newsletterTitle")}</h2>
      <p className="hero-body">{t("newsletterSubtitle")}</p>
      <p className="text-sm text-slate-400 mt-3 mb-4">Get the latest supply chain insights delivered to your inbox.</p>
      <p className="text-xs text-slate-500 mb-4">Get supply chain alerts delivered to your inbox.</p>
      <div className="inline-field">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Enter your email address"
          aria-label="Email address"
          className="bg-slate-800/50 border-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
        />
        <button 
          type="submit" 
          disabled={status === "loading"}
          className="bg-gradient-to-r from-cyan-600 to-orange-600 hover:brightness-110 transition rounded-full px-6 py-3 font-semibold"
        >
          {status === "loading" ? t("sending") : t("subscribe")}
        </button>
      </div>
      {status === "success" ? <p className="form-note success">{t("subscribeSuccess")}</p> : null}
      {status === "error" ? <p className="form-note error">{t("subscribeError")}</p> : null}
    </form>
  );
}
