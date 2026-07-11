"use client";

import { useLocale } from "@/lib/LanguageContext";
import Link from "next/link";
import {
  Mail,
  Phone,
  MapPin,
  ChevronRight
} from "lucide-react";

export default function Footer() {
  const { t } = useLocale();

  const productLinks = [
    { href: "/features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
    { href: "/estimator", label: "Estimator" },
    { href: "/agent", label: "AI Agent" },
  ];

  const companyLinks = [
    { href: "/about", label: "About Us" },
    { href: "/blog", label: "Blog" },
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
    <footer className="bg-slate-950/95 border-t border-slate-800 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <div className="text-left">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-[#00A3FF] to-[#FF6B00] bg-clip-text text-transparent mb-3">
                Logixa Flow
              </h3>
              <p className="text-sm text-slate-300 mb-4">
                {t("smarterSupplyChain")}
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
              {/* Social Media */}
              <div className="flex gap-3 mt-6">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-slate-800/50 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all"
                >
                  Facebook
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-slate-800/50 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all"
                >
                  Twitter
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-slate-800/50 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all"
                >
                  LinkedIn
                </a>
              </div>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-2 text-sm text-slate-300 hover:text-cyan-400 transition-colors"
                  >
                    <ChevronRight className="h-3 w-3" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-2 text-sm text-slate-300 hover:text-cyan-400 transition-colors"
                  >
                    <ChevronRight className="h-3 w-3" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-3">
              {resourcesLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-2 text-sm text-slate-300 hover:text-cyan-400 transition-colors"
                  >
                    <ChevronRight className="h-3 w-3" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-700/50 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-400">
              {t("allRightsReserved")} © {new Date().getFullYear()} Logixa Flow
            </p>
            <div className="flex gap-6">
              {legalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-slate-300 hover:text-cyan-400 transition-colors font-medium"
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