"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/shadcn/Button";
import LanguageToggle from "./LanguageToggle";
import { useLocale } from "@/lib/LanguageContext";

export default function MobileDrawer() {
  const [open, setOpen] = useState(false);
  const { t } = useLocale();

  return (
    <div className="sm:hidden">
      <Button variant="ghost" onClick={() => setOpen(true)} aria-label="Open menu">
        Menu
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-card p-4 text-foreground">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Menu</h3>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <LanguageToggle />
            </div>
            <nav className="mt-4 flex flex-col gap-3 text-sm">
              <Link href="/" className="hover:text-cyan-400">{t("home")}</Link>
              <Link href="/blog" className="hover:text-cyan-400">{t("insights")}</Link>
              <Link href="/estimator" className="hover:text-cyan-400">{t("estimator")}</Link>
              <Link href="/about" className="hover:text-cyan-400">{t("about")}</Link>
              <Link href="/contact" className="hover:text-cyan-400">{t("contact")}</Link>
            </nav>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
