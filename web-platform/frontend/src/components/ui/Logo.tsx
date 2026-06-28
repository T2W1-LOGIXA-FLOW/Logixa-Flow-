"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function Logo() {
  const [isClickedGlow, setIsClickedGlow] = useState(false);

  const handleLogoClick = () => {
    setIsClickedGlow(true);
    setTimeout(() => {
      setIsClickedGlow(false);
    }, 1000);
  };

  return (
    <div onClick={handleLogoClick} className="inline-block cursor-pointer">
      <Link href="/" className="flex items-center gap-3 group select-none">
        <div
          className={`w-9 h-9 flex items-center justify-center logo-transition ${
            isClickedGlow
              ? "drop-shadow-[0_0_18px_rgba(0,163,255,0.95)] scale-105"
              : "hover:drop-shadow-[0_0_8px_rgba(0,163,255,0.4)] group-hover:scale-[1.02]"
          }`}
        >
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path
              d="M8 32L20 20L32 8M8 8L20 20L32 32"
              stroke={isClickedGlow ? "#1e293b" : "#334155"}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="logo-transition"
            />
            <path
              d="M8 32L20 20L32 8"
              stroke="url(#cyanFlowGradient)"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-logo-flow-line"
            />
            <path
              d="M8 8L20 20L32 32"
              stroke="url(#orangeFlowGradient)"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-logo-flow-line"
              style={{ animationDirection: "reverse" }}
            />
            <defs>
              <linearGradient id="cyanFlowGradient" x1="8" y1="32" x2="32" y2="8" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#00a3ff" />
                <stop offset="50%" stopColor="#67e8f9" />
                <stop offset="100%" stopColor="#00a3ff" />
              </linearGradient>
              <linearGradient id="orangeFlowGradient" x1="8" y1="8" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ff6b00" />
                <stop offset="50%" stopColor="#fdba74" />
                <stop offset="100%" stopColor="#ff6b00" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="flex flex-col justify-center font-sans">
          <span
            className={`text-base font-black tracking-wider uppercase logo-transition ${
              isClickedGlow
                ? "text-[#00a3ff] drop-shadow-[0_0_12px_rgba(0,163,255,0.8)]"
                : "text-slate-900 dark:text-slate-50 group-hover:text-[#00a3ff]"
            }`}
          >
            LOGIXA <span className={isClickedGlow ? "text-[#00a3ff]" : "text-[#ff6b00] logo-transition"}>FLOW</span>
          </span>
          <span className="text-[9px] font-medium tracking-[0.18em] text-slate-400 uppercase leading-none mt-0.5">
            Research Collective
          </span>
        </div>
      </Link>
    </div>
  );
}
