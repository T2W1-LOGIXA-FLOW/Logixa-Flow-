"use client";

/**
 * StaticSphereBackground - Lightweight, non-animated background sphere
 * 
 * Purpose: Decorative background element for public subpages
 * - No animation system
 * - No requestAnimationFrame
 * - No mouse interaction
 * - CSS-based radial gradient
 * - Positioned right-side, slightly offset
 * 
 * Usage: Mount on Insights, About, Contact pages (not Home)
 */

interface StaticSphereBackgroundProps {
  variant?: "cyan" | "orange" | "mixed";
  opacity?: "low" | "medium" | "high";
  position?: "right" | "center-right";
}

export default function StaticSphereBackground({
  variant = "cyan",
  opacity = "medium",
  position = "right",
}: StaticSphereBackgroundProps) {
  // Opacity levels
  const opacityMap = {
    low: "opacity-10",
    medium: "opacity-20",
    high: "opacity-30",
  };

  // Position classes - slightly right of center, upper-middle area
  const positionMap = {
    right: "right-[8%] top-[32%] md:right-[10%] md:top-[35%]",
    "center-right": "right-[15%] top-[28%] md:right-[18%] md:top-[30%]",
  };

  // Color variants - use Logixa brand colors
  const gradientMap = {
    cyan: "from-cyan-500/40 via-cyan-400/20 to-transparent",
    orange: "from-orange-500/40 via-orange-400/20 to-transparent",
    mixed:
      "from-cyan-500/30 via-purple-500/10 to-orange-500/20",
  };

  return (
    <>
      {/* Main sphere background - absolute positioning, behind all content */}
      <div
        className={`
          absolute
          ${positionMap[position]}
          w-96 h-96
          md:w-[500px] md:h-[500px]
          ${opacityMap[opacity]}
          pointer-events-none
          z-0
          blur-3xl
        `}
        aria-hidden="true"
      >
        {/* Outer radial gradient sphere */}
        <div
          className={`
            absolute
            inset-0
            rounded-full
            bg-gradient-to-br
            ${gradientMap[variant]}
            animate-none
          `}
          style={{
            boxShadow:
              "0 0 100px 40px rgba(6, 182, 212, 0.1), inset -40px -40px 80px rgba(0, 0, 0, 0.3)",
          }}
        />

        {/* Inner glow layer */}
        <div
          className={`
            absolute
            inset-12
            rounded-full
            bg-gradient-radial
            from-cyan-300/20
            to-transparent
          `}
          style={{
            background:
              "radial-gradient(circle, rgba(34, 211, 238, 0.15), transparent 70%)",
          }}
        />

        {/* Rim light effect (subtle, right edge) */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 75% 25%, rgba(6, 182, 212, 0.08), transparent 50%)",
          }}
        />
      </div>

      {/* Mobile adjustment - reduce right offset to prevent overflow */}
      <style>{`
        @media (max-width: 768px) {
          [aria-hidden="true"] {
            right: -20% !important;
            top: 18% !important;
            opacity: 0.12 !important;
            width: 24rem;
            height: 24rem;
          }
        }
      `}</style>
    </>
  );
}
