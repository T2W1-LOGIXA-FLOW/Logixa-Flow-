"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

// --- BRAND COLOR CONFIGURATION ---
export const CONFIG = {
  // Brand Colors (Cyan & Orange)
  primaryColor: "0, 199, 255", // RGB for Cyan (#00c7ff)
  secondaryColor: "255, 100, 0", // RGB for Orange (#ff6400)

  // Animation Speed
  sphereRotationDuration: "240s",
  gridPanDuration: "180s",
  coreGlowDuration: "25s",

  // Intensity & Depth - Reduced for calmer subpage backgrounds
  wireframeOpacity: 0.45,
  wireframeShadowIntensity: 40,
  coreBlur: 200,
  parallaxDepth: 25,
  lerpFactor: 0.08,
  sphereDensity: 8,
};

// Helper for lerp
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * BackgroundSphere
 * 
 * Background-only animated sphere component
 * - No hero content (removed Layer 6)
 * - No noise layer (removed Layer 5)
 * - Brand colors only (cyan + orange)
 * - Mobile responsive (parallax disabled, reduced density)
 */
export default function BackgroundSphere() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const mo = new MutationObserver(() => check());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  const [targetMousePos, setTargetMousePos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const currentMousePos = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const animateLerp = useCallback(() => {
    currentMousePos.current.x = lerp(
      currentMousePos.current.x,
      targetMousePos.x,
      CONFIG.lerpFactor
    );
    currentMousePos.current.y = lerp(
      currentMousePos.current.y,
      targetMousePos.y,
      CONFIG.lerpFactor
    );

    setTargetMousePos(() => ({
      x: currentMousePos.current.x,
      y: currentMousePos.current.y,
    }));

    animationFrameRef.current = requestAnimationFrame(animateLerp);
  }, [targetMousePos.x, targetMousePos.y]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animateLerp);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animateLerp]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isMobile) return;
    
    const { clientX, clientY } = e;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const x = (clientX - centerX) / centerX;
    const y = (clientY - centerY) / centerY;
    setTargetMousePos({ x, y });
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) {
      window.addEventListener("mousemove", handleMouseMove);
      return () => window.removeEventListener("mousemove", handleMouseMove);
    }
  }, [handleMouseMove, isMobile]);

  const { x: smoothX, y: smoothY } = currentMousePos.current;

  // Parallax (disabled on mobile)
  const parallaxDepth = isMobile ? 0 : CONFIG.parallaxDepth;
  const rotationStrength = 5;

  const baseTranslate = `translate3d(${smoothX * parallaxDepth}px, ${smoothY * parallaxDepth}px, 0)`;
  const gridTranslate = `translate3d(${-smoothX * (parallaxDepth / 2)}px, ${-smoothY * (parallaxDepth / 2)}px, 0)`;
  const hazeTranslate = `translate3d(${smoothX * (parallaxDepth / 2)}px, ${smoothY * (parallaxDepth / 2)}px, 0)`;

  const tiltRotateX = smoothY * rotationStrength;
  const tiltRotateY = -smoothX * rotationStrength;
  const tiltTranslate = `rotateX(${tiltRotateX}deg) rotateY(${tiltRotateY}deg)`;

  // Responsive sphere density
  const sphereDensity = isMobile ? 6 : CONFIG.sphereDensity;

  // Generate sphere rings
  const sphereRings = Array.from({ length: sphereDensity }, (_, i) => {
    const step = 90 / (sphereDensity / 2);
    const angle = i * step;
    const commonStyle = {
      transform: i % 2 === 0 ? `rotateY(${angle}deg)` : `rotateX(${angle}deg)`,
    };
    return (
      <div
        key={`ring-${i}`}
        className="wireframe-line"
        style={commonStyle}
        aria-hidden="true"
      />
    );
  });

  const coreLightStyle = {
    width: "400px",
    height: "400px",
    backgroundImage: `radial-gradient(circle, rgba(${CONFIG.secondaryColor}, ${isDark ? 0.65 : 0.45}) 0%, transparent 70%)`,
    filter: `blur(${CONFIG.coreBlur}px)`,
    boxShadow: `0 0 ${CONFIG.coreBlur / 2}px 30px rgba(${CONFIG.secondaryColor}, ${isDark ? 0.35 : 0.2}), 0 0 ${CONFIG.coreBlur}px 50px rgba(${CONFIG.primaryColor}, ${isDark ? 0.25 : 0.15})`,
  };

  const panningGridStyle = {
    transform: gridTranslate,
    backgroundImage:
      "repeating-linear-gradient(to right, rgba(10,10,10,0.9) 1px, transparent 1px), repeating-linear-gradient(to bottom, rgba(10,10,10,0.9) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
    opacity: 0.15,
  };

  const hazeStyle = {
    transform: hazeTranslate,
    backgroundImage: `radial-gradient(circle at 50% 50%, rgba(${CONFIG.primaryColor}, ${isDark ? 0.28 : 0.15}) 0%, transparent 50%)`,
    filter: "blur(150px)",
    opacity: isDark ? 0.75 : 0.6,
    mixBlendMode: "screen" as const,
  };

  const deepBaseStyle = {
    transform: baseTranslate,
    backgroundImage: `radial-gradient(at 50% 50%, rgba(${CONFIG.primaryColor}, ${isDark ? 0.12 : 0.08}) 0%, #030712 90%)`,
  };

  const bloomStyle = {
    transform: baseTranslate,
    backgroundImage: `radial-gradient(circle at 50% 50%, rgba(${CONFIG.primaryColor}, ${isDark ? 0.5 : 0.35}) 0%, transparent 50%), radial-gradient(circle at 10% 10%, rgba(${CONFIG.secondaryColor}, ${isDark ? 0.35 : 0.25}) 0%, transparent 30%)`,
    mixBlendMode: "screen" as const,
    filter: "blur(100px)",
    opacity: isDark ? 1 : 0.95,
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-gray-950 z-0 pointer-events-none">
      {/* Layer 0: Panning Grid Layer */}
      <div className="absolute inset-0 panning-grid" style={panningGridStyle} />

      {/* Layer 1: Volumetric Haze */}
      <div className="absolute inset-0" style={hazeStyle} />

      {/* Layer 2: Deep Base Background & Core Glow */}
      <div className="absolute inset-0" style={deepBaseStyle}>
        <div
          className="core-light absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={coreLightStyle}
        />
      </div>

      {/* Layer 3: Geometric Glow Sphere (3D Animated Element) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 sphere-container z-40 pointer-events-none">
        <div
          className="w-[700px] h-[700px] sphere-rotation"
          style={{
            transform: tiltTranslate,
            transformOrigin: "center center",
            animationDuration: CONFIG.sphereRotationDuration,
          }}
        >
          {sphereRings}
        </div>
      </div>

      {/* Layer 4: Soft Radial Bloom (Ambient Light Layer) */}
      <div className="absolute inset-0" style={bloomStyle} />

      {/* Layer 5: Final Vignette overlay */}
      <div className="absolute inset-0 pointer-events-none vignette-overlay" />
    </div>
  );
}
