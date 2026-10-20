'use client';

import React from 'react';

interface LogixaFlowLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function LogixaFlowLogo({
  className = '',
  size = 40,
  showText = true,
}: LogixaFlowLogoProps) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Clean Squircle App Icon Tile */}
      <img
        src="/logo.svg"
        alt="Logixa Flow Icon"
        width={size}
        height={size}
        className="shrink-0 object-contain rounded-2xl drop-shadow-[0_0_12px_rgba(0,229,255,0.25)] transition-transform duration-200 hover:scale-105"
      />

      {showText && (
        <div className="flex flex-col leading-none">
          <span className="text-[16px] font-bold tracking-tight text-white">
            Logixa Flow
          </span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Supply Chain OS
          </span>
        </div>
      )}
    </div>
  );
}

export default LogixaFlowLogo;
