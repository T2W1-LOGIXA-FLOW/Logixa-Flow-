"use client";

import React from "react";
import { useLocale } from "@/lib/LanguageContext";
import Button from "./Button";

export default function LanguageToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <Button
      variant="ghost"
      onClick={() => setLocale(locale === "en" ? "mm" : "en")}
      className="h-10 px-3 text-xs font-semibold border border-input flex items-center gap-1"
      aria-label="Toggle language"
    >
      <span>🌐</span>
      <span className={locale === "en" ? "text-white font-semibold" : "text-slate-400 hover:text-white"}>EN</span>
      <span className="text-slate-400">|</span>
      <span className={locale === "mm" ? "text-white font-semibold" : "text-slate-400 hover:text-white"}>MM</span>
    </Button>
  );
}
