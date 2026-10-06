"use client";

import Link from "next/link";
import LanguageToggle from "./shadcn/LanguageToggle";
import MobileDrawer from "./shadcn/MobileDrawer";
import { useLocale } from "@/lib/LanguageContext";

const navItems = [
  { href: "/", label: "home", translate: true },
  { href: "/blog", label: "insights", translate: true },
  ...(process.env.NEXT_PUBLIC_USER_AI_ENABLED === "true" ? [{ href: "/agent", label: "AI Agent" }] : []),
  { href: "/about", label: "about", translate: true },
  { href: "/contact", label: "contact", translate: true },
];

export default function Header() {
  const { t } = useLocale();

  return (
    <header className="w-full px-4 md:px-8 py-4 border-b border-slate-800 relative z-30 sticky top-0 bg-slate-950/50 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group hover:opacity-100 transition-all" aria-label="Logixa Flow home">
          <span className="bg-gradient-to-r from-[#00A3FF] to-[#FF6B00] bg-clip-text text-transparent opacity-95 group-hover:opacity-100 group-hover:drop-shadow-[0_0_12px_rgba(0,163,255,0.5)] transition-all duration-300 font-heading font-extrabold tracking-wide text-lg">
            Logixa Flow
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link className="nav-gradient-link text-slate-300" key={item.href} href={item.href}>
              {item.translate ? t(item.label) : item.label}
            </Link>
          ))}
          <div className="flex items-center pl-4 border-l border-slate-700/50">
            <LanguageToggle />
          </div>
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <LanguageToggle />
          <MobileDrawer />
        </div>
      </div>
    </header>
  );
}
