"use client";

import dynamic from "next/dynamic";
import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface DotGlobeHeroProps {
  rotationSpeed?: number;
  globeRadius?: number;
  className?: string;
  children?: React.ReactNode;
}

const GlobeCanvas = dynamic(() => import("./globe-canvas"), {
  ssr: false,
  loading: () => null,
});

const DotGlobeHero = React.forwardRef<
  HTMLDivElement,
  DotGlobeHeroProps
>(({
  rotationSpeed = 0.005,
  globeRadius = 1,
  className,
  children,
  ...props
}, ref) => {
  void ref;
  const [scrollOpacity, setScrollOpacity] = useState(0.08);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Calculate how much of the hero section is still visible
      const visibleRatio = Math.max(0, Math.min(1, rect.bottom / viewportHeight));
      
      // When the hero is mostly scrolled away (visibleRatio < 0.3), reduce opacity significantly
      // When the hero is fully visible (visibleRatio > 0.7), keep full opacity
      if (visibleRatio > 0.7) {
        setScrollOpacity(0.08); // Full opacity in hero section
      } else if (visibleRatio < 0.3) {
        setScrollOpacity(0.10); // Reduced opacity when scrolled past hero
      } else {
        // Smooth transition between the two states
        const transitionOpacity = 0.08 + (0.7 - visibleRatio) * (0.02 / 0.4);
        setScrollOpacity(transitionOpacity);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full min-h-[760px] overflow-hidden sm:min-h-screen",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <GlobeCanvas
          rotationSpeed={rotationSpeed}
          radius={globeRadius}
          scrollOpacity={scrollOpacity}
        />
      </div>

      <div className="relative z-10 flex min-h-[760px] flex-col items-center justify-center sm:min-h-screen">
        {children}
      </div>

      <div className="hidden">
      </div>
    </div>
  );
});

DotGlobeHero.displayName = "DotGlobeHero";

export { DotGlobeHero, type DotGlobeHeroProps };
