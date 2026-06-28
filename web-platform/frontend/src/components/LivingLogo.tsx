"use client";

import { useId } from "react";

type LivingLogoProps = {
  size?: number;
};

const BRAND_CYAN = "#00A3FF";
const BRAND_ORANGE = "#FF6B00";

export default function LivingLogo({ size = 42 }: LivingLogoProps) {
  const uid = useId().replace(/:/g, "");
  const gradientId = `logoFlowGradient-${uid}`;
  const glowId = `logoGlow-${uid}`;

  return (
    <div
      className="living-logo-container flex items-center justify-center transition-all duration-500 hover:drop-shadow-[0_0_12px_rgba(0,163,255,0.7)] pointer-events-none flex-shrink-0"
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 42 42"
        className="living-logo"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={BRAND_CYAN}>
              <animate
                attributeName="stop-color"
                values={`${BRAND_CYAN};${BRAND_ORANGE};${BRAND_CYAN}`}
                dur="3s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="50%" stopColor={BRAND_ORANGE}>
              <animate
                attributeName="stop-color"
                values={`${BRAND_ORANGE};${BRAND_CYAN};${BRAND_ORANGE}`}
                dur="3s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor={BRAND_CYAN}>
              <animate
                attributeName="stop-color"
                values={`${BRAND_CYAN};${BRAND_ORANGE};${BRAND_CYAN}`}
                dur="3s"
                repeatCount="indefinite"
              />
            </stop>
            <animateTransform
              attributeName="gradientTransform"
              type="rotate"
              from="0 21 21"
              to="360 21 21"
              dur="6s"
              repeatCount="indefinite"
            />
          </linearGradient>

          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle
          cx="21"
          cy="21"
          r="18"
          fill={`url(#${gradientId})`}
          opacity="0.35"
          filter={`url(#${glowId})`}
          className="living-logo-glow"
        />

        <circle cx="21" cy="21" r="16" fill={`url(#${gradientId})`} />

        <path
          d="M 14 21 Q 21 14 28 21 Q 21 28 14 21"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="living-logo-flow"
        />

        <circle cx="21" cy="21" r="3" fill="currentColor" opacity="0.95" />

        <g className="living-logo-orbit">
          <circle cx="33" cy="21" r="1.5" fill="currentColor" opacity="0.85" />
          <circle cx="24.5" cy="29.5" r="1.5" fill="currentColor" opacity="0.7" />
          <circle cx="13.5" cy="26.5" r="1.5" fill="currentColor" opacity="0.75" />
        </g>
      </svg>
    </div>
  );
}
