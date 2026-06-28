"use client";

import { useState } from "react";
import { subscribe } from "./api";
import { useLocale } from "@/lib/LanguageContext";

export default function Footer() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      await subscribe(email);
      setEmail("");
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <footer className="site-footer">
      <div>
        <strong className="text-xl font-heading bg-gradient-to-r from-[#00A3FF] to-[#FF6B00] bg-clip-text text-transparent">
          Logixa Flow
        </strong>
        <p className="text-sm text-muted mt-2">{t("smarterSupplyChain")}</p>
        <p className="text-xs text-muted mt-4">{t("allRightsReserved")}</p>
      </div>
      <div className="max-w-xs">
        <p className="text-sm font-semibold">{t("weeklySignals")}</p>
        <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-bg text-text"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="px-4 py-2 text-sm font-bold rounded-lg bg-gradient-to-r from-[#00A3FF] to-[#FF6B00] text-foreground disabled:opacity-50"
          >
            {status === "loading" ? "..." : t("subscribe")}
          </button>
        </form>
        {status === "success" && <p className="text-xs text-green-500 mt-1">{t("subscribed")}</p>}
        {status === "error" && <p className="text-xs text-red-500 mt-1">{t("subscribeError")}</p>}
      </div>
    </footer>
  );
}