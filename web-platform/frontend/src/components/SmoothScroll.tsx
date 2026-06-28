"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      // Initialize Lenis for smooth scrolling
      const lenis = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        gestureDirection: "vertical",
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
        infinite: false,
      } as ConstructorParameters<typeof Lenis>[0]);

      // Sync Lenis scrolling with GSAP ScrollTrigger
      lenis.on("scroll", ScrollTrigger.update);
      
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });

      gsap.ticker.lagSmoothing(0);

      return () => {
        try {
          lenis.destroy();
        } catch (e) {
          console.warn("Error destroying Lenis:", e);
        }
      };
    } catch (e) {
      console.warn("Lenis initialization failed:", e);
      return () => {};
    }
  }, []);

  return <>{children}</>;
}
