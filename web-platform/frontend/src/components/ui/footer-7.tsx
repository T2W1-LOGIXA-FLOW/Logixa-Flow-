"use client";

import React from "react";
import Link from "next/link";

interface Footer7Props {
  logo?: {
    url: string;
    src: string;
    alt: string;
    title: string;
  };
  sections?: Array<{
    title: string;
    links: Array<{ name: string; href: string }>;
  }>;
  description?: string;
  socialLinks?: Array<{
    icon: React.ReactElement;
    href: string;
    label: string;
  }>;
  copyright?: string;
  legalLinks?: Array<{
    name: string;
    href: string;
  }>;
}

const defaultSections = [
  {
    title: "Platform",
    links: [
      { name: "Home", href: "/" },
      { name: "Insights", href: "/blog" },
      { name: "Contact", href: "/contact" },
      { name: "Pricing", href: "/pricing" },
      { name: "Features", href: "/features" },
      { name: "Case Studies", href: "/case-studies" },
      { name: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About", href: "/about" },
      { name: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Legal",
    links: [
      { name: "Privacy", href: "/privacy" },
      { name: "Terms", href: "/terms" },
    ],
  },
];

const defaultSocialLinks: Array<{
  icon: React.ReactElement;
  href: string;
  label: string;
}> = [];

const defaultLegalLinks = [
  { name: "Terms and Conditions", href: "/terms" },
  { name: "Privacy Policy", href: "/privacy" },
];

export const Footer7 = ({
  logo = {
    url: "/",
    src: "/logo.svg",
    alt: "logo",
    title: "Logixa Flow",
  },
  sections = defaultSections,
  description = "Actionable supply chain intelligence for Myanmar business teams.",
  socialLinks = defaultSocialLinks,
  copyright = "© 2026 Logixa Flow. All rights reserved.",
  legalLinks = defaultLegalLinks,
}: Footer7Props) => {
  return (
    <section className="bg-slate-900/60 border-t border-slate-700/50 backdrop-blur-xl shadow-[0_0_40px_rgba(15,23,42,0.25)] py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(300px,1fr)_repeat(3,220px)] lg:items-start">
          <div className="flex flex-col gap-5">
            <Link href={logo.url} className="flex items-center gap-3" aria-label="Logixa Flow home">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-sm font-black text-white shadow-lg shadow-cyan-500/10">
                LF
              </span>
              <span className="bg-gradient-to-r from-cyan-400 to-orange-400 bg-clip-text text-2xl font-bold text-transparent">
                {logo.title}
              </span>
            </Link>
            <p className="max-w-sm text-sm leading-7 text-slate-300">
              {description}
            </p>
          </div>

          <div className="grid gap-8 grid-cols-1 sm:grid-cols-3">
            {/* PLATFORM column */}
            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.24em] text-slate-200">
                PLATFORM
              </h3>
              <ul className="space-y-3 text-sm text-slate-400">
                {sections[0]?.links?.map((link, linkIdx) => (
                  <li key={linkIdx} className="font-medium transition-colors hover:text-cyan-300">
                    <Link href={link.href}>{link.name}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* COMPANY column */}
            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.24em] text-slate-200">
                COMPANY
              </h3>
              <ul className="space-y-3 text-sm text-slate-400">
                {sections[1]?.links?.map((link, linkIdx) => (
                  <li key={linkIdx} className="font-medium transition-colors hover:text-cyan-300">
                    <Link href={link.href}>{link.name}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* LEGAL column */}
            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.24em] text-slate-200">
                LEGAL
              </h3>
              <ul className="space-y-3 text-sm text-slate-400">
                {sections[2]?.links?.map((link, linkIdx) => (
                  <li key={linkIdx} className="font-medium transition-colors hover:text-cyan-300">
                    <Link href={link.href}>{link.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-slate-700/50 py-8 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>{copyright}</p>
          <div className="flex flex-wrap gap-4 text-slate-400">
            {legalLinks.map((link, idx) => (
              <Link key={idx} href={link.href} className="transition-colors hover:text-cyan-300">
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Footer7;
