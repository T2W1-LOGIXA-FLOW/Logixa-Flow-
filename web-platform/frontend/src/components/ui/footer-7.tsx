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
  copyright = "(c) 2026 Logixa Flow. All rights reserved.",
  legalLinks = defaultLegalLinks,
}: Footer7Props) => {
  return (
    <section className="border-t border-cyan-500/10 bg-slate-950/95 py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex w-full flex-col justify-between gap-10 lg:flex-row lg:items-start lg:text-left">
          <div className="flex w-full flex-col justify-between gap-6 lg:max-w-md lg:items-start">
            <div className="flex items-center gap-2 lg:justify-start">
              <Link href={logo.url} className="flex items-center gap-3" aria-label="Logixa Flow home">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/30 bg-gradient-to-br from-cyan-500/25 to-orange-500/25 text-xs font-black text-white shadow-lg shadow-cyan-500/10">
                  LF
                </span>
                <span className="bg-gradient-to-r from-cyan-400 to-orange-400 bg-clip-text text-xl font-bold text-transparent">
                  {logo.title}
                </span>
              </Link>
            </div>
            <p className="max-w-sm text-sm leading-6 text-slate-400">
              {description}
            </p>
            {socialLinks.length > 0 ? (
              <ul className="flex items-center space-x-6 text-slate-400">
                {socialLinks.map((social, idx) => (
                  <li key={idx} className="font-medium hover:text-cyan-300">
                    <a href={social.href} aria-label={social.label}>
                      {social.icon}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid w-full gap-6 md:grid-cols-3 lg:gap-20">
            {sections.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-slate-200">
                  {section.title}
                </h3>
                <ul className="space-y-3 text-sm text-slate-400">
                  {section.links.map((link, linkIdx) => (
                    <li
                      key={linkIdx}
                      className="font-medium transition-colors hover:text-cyan-300"
                    >
                      <Link href={link.href}>{link.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col justify-between gap-4 border-t border-slate-800 py-8 text-xs font-medium text-slate-500 md:flex-row md:items-center md:text-left">
          <p className="order-2 lg:order-1">{copyright}</p>
          <ul className="order-1 flex flex-col gap-2 md:order-2 md:flex-row">
            {legalLinks.map((link, idx) => (
              <li key={idx} className="transition-colors hover:text-cyan-300">
                <Link href={link.href}>{link.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default Footer7;
