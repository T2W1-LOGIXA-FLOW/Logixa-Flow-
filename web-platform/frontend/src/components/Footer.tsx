"use client";

import Link from "next/link";
import React from "react";

export default function Footer() {
  return (
    <footer className="w-full bg-slate-900/60 backdrop-blur-md border-t border-slate-700/50 py-10 mt-auto text-slate-400">
      <div className="max-w-7xl mx-auto px-6">
        {/* Top Row: Main Footer Content */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">

          {/* 1. Left Logo & Tagline */}
          <div className="flex flex-col gap-3 max-w-xs">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="Logixa Flow" className="h-8 w-auto" />
              <span className="text-white font-bold text-lg">Logixa Flow</span>
            </div>
            <p className="text-sm leading-relaxed">Actionable supply chain intelligence for Myanmar business teams.</p>
          </div>

          {/* 2. Three Columns (THIS MUST BE 3 COLUMNS, NOT MERGED) */}
          <div className="flex flex-wrap gap-12 md:gap-16">

            {/* COLUMN 1: PLATFORM */}
            <div className="flex flex-col gap-3 min-w-[180px]">
              <h3 className="text-white font-semibold text-sm tracking-wider mb-1">PLATFORM</h3>
              <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <li><Link href="/" className="hover:text-cyan-400 transition-colors">Home</Link></li>
                <li><Link href="/blog" className="hover:text-cyan-400 transition-colors">Insights</Link></li>
                <li><Link href="/contact" className="hover:text-cyan-400 transition-colors">Contact</Link></li>
                <li><Link href="/pricing" className="hover:text-cyan-400 transition-colors">Pricing</Link></li>
                <li><Link href="/features" className="hover:text-cyan-400 transition-colors">Features</Link></li>
                <li><Link href="/case-studies" className="hover:text-cyan-400 transition-colors">Case Studies</Link></li>
                <li><Link href="/faq" className="hover:text-cyan-400 transition-colors">FAQ</Link></li>
              </ul>
            </div>

            {/* COLUMN 2: COMPANY */}
            <div className="flex flex-col gap-3 min-w-[120px]">
              <h3 className="text-white font-semibold text-sm tracking-wider mb-1">COMPANY</h3>
              <ul className="flex flex-col gap-2 text-sm">
                <li><Link href="/about" className="hover:text-cyan-400 transition-colors">About</Link></li>
                <li><Link href="/blog" className="hover:text-cyan-400 transition-colors">Blog</Link></li>
              </ul>
            </div>

            {/* COLUMN 3: LEGAL */}
            <div className="flex flex-col gap-3">
              <h3 className="text-white font-semibold text-sm tracking-wider mb-1">LEGAL</h3>
              <ul className="flex flex-col gap-2 text-sm">
                <li><Link href="/privacy" className="hover:text-cyan-400 transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-cyan-400 transition-colors">Terms</Link></li>
              </ul>
            </div>

          </div>
        </div>

        {/* Bottom Row: Copyright */}
        <div className="mt-8 pt-8 border-t border-slate-700/30 flex flex-col md:flex-row justify-between items-center text-xs">
          <p>© 2026 Logixa Flow. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="/terms" className="hover:text-cyan-400">Terms and Conditions</Link>
            <Link href="/privacy" className="hover:text-cyan-400">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}