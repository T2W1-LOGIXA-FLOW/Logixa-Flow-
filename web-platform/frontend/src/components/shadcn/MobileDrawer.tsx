"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/shadcn/Button";
import { useLocale } from "@/lib/LanguageContext";

export default function MobileDrawer() {
  const [open, setOpen] = useState(false);
  const { t } = useLocale();

  return (
    <div className="md:hidden">
      <Button variant="ghost" onClick={() => setOpen(true)} aria-label="Open menu">
        Menu
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[min(18rem,calc(100vw-2rem))] border-r border-cyan-400/15 bg-slate-950 p-5 text-foreground shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="bg-gradient-to-r from-[#00A3FF] to-[#FF6B00] bg-clip-text text-lg font-extrabold text-transparent">
                Logixa Flow
              </h3>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
            <nav className="mt-6 flex flex-col gap-2 text-sm">
              <Link href="/" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-slate-200 hover:bg-cyan-400/10 hover:text-cyan-300">{t("home")}</Link>
              <Link href="/blog" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-slate-200 hover:bg-cyan-400/10 hover:text-cyan-300">{t("insights")}</Link>
              <Link href="/agent" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-slate-200 hover:bg-cyan-400/10 hover:text-cyan-300">AI Agent</Link>
              <Link href="/estimator" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-slate-200 hover:bg-cyan-400/10 hover:text-cyan-300">Estimator</Link>
              <Link href="/about" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-slate-200 hover:bg-cyan-400/10 hover:text-cyan-300">{t("about")}</Link>
              <Link href="/contact" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-slate-200 hover:bg-cyan-400/10 hover:text-cyan-300">{t("contact")}</Link>
            </nav>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
