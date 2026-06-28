"use client";

const BRAND_CYAN = "#00A3FF";
const BRAND_ORANGE = "#FF6B00";

export default function MyanmarFlowMap() {
  return (
    <svg
      className="myanmar-flow-map"
      viewBox="0 0 254 280"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Myanmar logistics flow map"
      role="img"
    >
      <defs>
        <filter id="myanmarNodeGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <image
        href="/images/myanmar-map.svg"
        x="0"
        y="0"
        width="254"
        height="280"
        preserveAspectRatio="xMidYMid meet"
        opacity="0.92"
      />

      <g fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#myanmarNodeGlow)">
        <path d="M108 58 C121 83 130 108 136 136" stroke={BRAND_CYAN} strokeWidth="1.6" opacity="0.72" />
        <path d="M82 146 C104 140 123 139 146 151" stroke={BRAND_ORANGE} strokeWidth="1.7" opacity="0.75" />
        <path d="M112 202 C130 185 143 168 156 146" stroke={BRAND_CYAN} strokeWidth="1.4" opacity="0.62" />
        <path d="M136 136 C138 160 137 181 130 210" stroke={BRAND_ORANGE} strokeWidth="1.2" opacity="0.55" strokeDasharray="4 6" />
      </g>

      <g filter="url(#myanmarNodeGlow)">
        <circle cx="108" cy="58" r="4" fill={BRAND_CYAN} />
        <circle cx="136" cy="136" r="3.8" fill={BRAND_CYAN} />
        <circle cx="82" cy="146" r="3.5" fill={BRAND_CYAN} />
        <circle cx="146" cy="151" r="3.5" fill={BRAND_ORANGE} />
        <circle cx="156" cy="146" r="3.2" fill={BRAND_ORANGE} />
        <circle cx="112" cy="202" r="3.2" fill={BRAND_CYAN} />
        <circle cx="130" cy="210" r="3.2" fill={BRAND_ORANGE} />
      </g>
    </svg>
  );
}
