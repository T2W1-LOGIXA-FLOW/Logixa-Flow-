"use client";

import React from "react";

interface LogixaFlowLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function LogixaFlowLogo({
  className = "",
  size = 38,
  showText = true,
}: LogixaFlowLogoProps) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* 3D Cyan-Orange Energy Conduit X-Nexus SVG */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-105"
      >
        <defs>
          <linearGradient id="lf-metallic" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="40%" stopColor="#0f172a" />
            <stop offset="70%" stopColor="#020617" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          <linearGradient id="lf-cyan-conduit" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="40%" stopColor="#38bdf8" />
            <stop offset="75%" stopColor="#67e8f9" />
            <stop offset="100%" stopColor="#bae6fd" />
          </linearGradient>

          <linearGradient id="lf-orange-conduit" x1="100%" y1="50%" x2="0%" y2="50%">
            <stop offset="0%" stopColor="#c2410c" />
            <stop offset="40%" stopColor="#ea580c" />
            <stop offset="75%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fed7aa" />
          </linearGradient>

          <radialGradient id="lf-node" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="60%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>

          <filter id="lf-cyan-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="lf-orange-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Metallic X Chassis */}
        <path
          d="M 120 70 L 200 70 Q 250 120 300 70 L 380 70 L 380 150 Q 330 210 380 270 L 380 350 L 300 350 Q 250 300 200 350 L 120 350 L 120 270 Q 170 210 120 150 Z"
          fill="url(#lf-metallic)"
          stroke="#334155"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* Left: Electric Cyan Conduits */}
        <g filter="url(#lf-cyan-glow)">
          <path d="M 135 110 Q 185 145 225 185" fill="none" stroke="url(#lf-cyan-conduit)" strokeWidth="13" strokeLinecap="round" />
          <path d="M 135 110 Q 185 145 225 185" fill="none" stroke="#e0f2fe" strokeWidth="4" strokeLinecap="round" />
          <path d="M 145 160 Q 180 190 205 210" fill="none" stroke="url(#lf-cyan-conduit)" strokeWidth="9" strokeLinecap="round" />
          <path d="M 135 310 Q 185 275 225 235" fill="none" stroke="url(#lf-cyan-conduit)" strokeWidth="13" strokeLinecap="round" />
          <path d="M 135 310 Q 185 275 225 235" fill="none" stroke="#e0f2fe" strokeWidth="4" strokeLinecap="round" />
          <path d="M 145 260 Q 180 230 205 210" fill="none" stroke="url(#lf-cyan-conduit)" strokeWidth="9" strokeLinecap="round" />
          <path d="M 140 145 Q 195 210 140 275" fill="none" stroke="#0ea5e9" strokeWidth="6" opacity="0.8" />
        </g>

        {/* Right: Fiery Orange Conduits */}
        <g filter="url(#lf-orange-glow)">
          <path d="M 365 110 Q 315 145 275 185" fill="none" stroke="url(#lf-orange-conduit)" strokeWidth="13" strokeLinecap="round" />
          <path d="M 365 110 Q 315 145 275 185" fill="none" stroke="#ffedd5" strokeWidth="4" strokeLinecap="round" />
          <path d="M 355 160 Q 320 190 295 210" fill="none" stroke="url(#lf-orange-conduit)" strokeWidth="9" strokeLinecap="round" />
          <path d="M 365 310 Q 315 275 275 235" fill="none" stroke="url(#lf-orange-conduit)" strokeWidth="13" strokeLinecap="round" />
          <path d="M 365 310 Q 315 275 275 235" fill="none" stroke="#ffedd5" strokeWidth="4" strokeLinecap="round" />
          <path d="M 355 260 Q 320 230 295 210" fill="none" stroke="url(#lf-orange-conduit)" strokeWidth="9" strokeLinecap="round" />
          <path d="M 360 145 Q 305 210 360 275" fill="none" stroke="#f97316" strokeWidth="6" opacity="0.8" />
        </g>

        {/* Central Matrix Hubs */}
        <g>
          <circle cx="250" cy="165" r="21" fill="url(#lf-node)" stroke="#475569" strokeWidth="3" />
          <circle cx="250" cy="165" r="7" fill="#38bdf8" />

          <circle cx="250" cy="255" r="21" fill="url(#lf-node)" stroke="#475569" strokeWidth="3" />
          <circle cx="250" cy="255" r="7" fill="#f97316" />

          <circle cx="205" cy="210" r="21" fill="url(#lf-node)" stroke="#38bdf8" strokeWidth="2.5" />
          <circle cx="205" cy="210" r="7" fill="#67e8f9" />

          <circle cx="295" cy="210" r="21" fill="url(#lf-node)" stroke="#f97316" strokeWidth="2.5" />
          <circle cx="295" cy="210" r="7" fill="#fdba74" />
        </g>
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className="text-[17px] font-black tracking-wider text-white">
              LOGIXA
            </span>
            <span className="text-[17px] font-black tracking-wider bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
              FLOW
            </span>
          </div>
          <span className="mt-1 text-[8.5px] font-bold uppercase tracking-[0.24em] text-slate-400">
            Smarter Supply Chain
          </span>
        </div>
      )}
    </div>
  );
}

export default LogixaFlowLogo;
