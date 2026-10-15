"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Mail, MapPin, Phone } from "lucide-react";

export default function Footer() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  const productLinks = [
    { href: "/features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
    ...(process.env.NEXT_PUBLIC_USER_AI_ENABLED === "true" ? [{ href: "/agent", label: "AI Agent" }] : []),
  ];

  const companyLinks = [
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact" },
    { href: "/case-studies", label: "Case Studies" },
  ];

  const resourcesLinks = [
    { href: "/insights", label: "Insights" },
    { href: "/faq", label: "FAQ" },
    { href: "/search", label: "Search" },
    { href: "/notifications", label: "Notifications" },
  ];

  const legalLinks = [
    { href: "/terms", label: "Terms of Service" },
    { href: "/privacy", label: "Privacy Policy" },
  ];

  return (
    <footer
      className={
        isHomePage
          ? "bg-slate-950 border-t border-slate-800 backdrop-blur-md"
          : "relative border-t border-cyan-400/10 bg-slate-950/35 shadow-[0_-24px_80px_rgba(2,6,23,0.45)] backdrop-blur-sm"
      }
    >
      <div className={`relative mx-auto max-w-7xl px-6 ${isHomePage ? "py-8" : "py-10 md:py-12"}`}>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="mb-3 bg-gradient-to-r from-[#00A3FF] to-[#FF6B00] bg-clip-text text-2xl font-bold text-transparent">
              Logixa Flow
            </h3>
            <p className="mb-4 text-sm text-slate-300">
              Smarter Supply Chain. Limitless Flow.
            </p>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-cyan-400" />
                <span>contact@logixaflow.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-cyan-400" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-cyan-400" />
                <span>San Francisco, CA</span>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-slate-800/50 px-4 py-2 text-sm text-slate-300 transition-all hover:bg-slate-700/50 hover:text-white"
              >
                Facebook
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-slate-800/50 px-4 py-2 text-sm text-slate-300 transition-all hover:bg-slate-700/50 hover:text-white"
              >
                Twitter
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-slate-800/50 px-4 py-2 text-sm text-slate-300 transition-all hover:bg-slate-700/50 hover:text-white"
              >
                LinkedIn
              </a>
            </div>
          </div>

          <FooterColumn title="Product" links={productLinks} />
          <FooterColumn title="Company" links={companyLinks} />
          <FooterColumn title="Resources" links={resourcesLinks} />
        </div>

        <div className="mt-8 border-t border-slate-700/50 pt-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-xs text-slate-400">
              (c) {new Date().getFullYear()} Logixa Flow. All rights reserved.
            </p>
            <div className="flex gap-6">
              {legalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-slate-300 transition-colors hover:text-cyan-400"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h4 className="mb-4 text-sm font-semibold text-white">{title}</h4>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex items-center gap-2 text-sm text-slate-300 transition-colors hover:text-cyan-400"
            >
              <ChevronRight className="h-3 w-3" />
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
