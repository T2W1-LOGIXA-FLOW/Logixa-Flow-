"use client";

import React from "react";

interface LogixaFlowLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function LogixaFlowLogo({
  className = "",
  size = 42,
  showText = true,
}: LogixaFlowLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* 100% Identical High-Definition SVG Symbol */}
      <img
        src="/logo.svg"
        alt="Logixa Flow Logo"
        width={size}
        height={size}
        className="shrink-0 object-contain transition-transform duration-300 hover:scale-105"
      />

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1">
            <span className="text-[17px] font-black tracking-wider text-white">
              LOGIX<span className="inline-block text-[15px] font-bold">Λ</span>
            </span>
            <span className="text-[17px] font-black tracking-wider text-[#FF5500]">
              FLOW
            </span>
          </div>
          <span className="mt-1 text-[8.5px] font-bold uppercase tracking-[0.24em] text-slate-400">
            Limitless Flow
          </span>
        </div>
      )}
    </div>
  );
}

export default LogixaFlowLogo;
