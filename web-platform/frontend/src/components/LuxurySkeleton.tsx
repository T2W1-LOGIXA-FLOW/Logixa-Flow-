"use client";

import { useEffect, useState } from "react";

interface LuxurySkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "card";
  width?: string;
  height?: string;
  lines?: number;
}

export default function LuxurySkeleton({
  className = "",
  variant = "rectangular",
  width = "100%",
  height = "20px",
  lines = 3,
}: LuxurySkeletonProps) {
  const [shimmerPosition, setShimmerPosition] = useState(-100);

  useEffect(() => {
    const animate = () => {
      setShimmerPosition((prev) => {
        if (prev >= 200) return -100;
        return prev + 2;
      });
    };

    const interval = setInterval(animate, 16);
    return () => clearInterval(interval);
  }, []);

  const baseStyle = {
    background: `linear-gradient(90deg, 
      rgba(0, 163, 255, 0.05) 0%, 
      rgba(0, 163, 255, 0.1) ${shimmerPosition}%, 
      rgba(255, 107, 0, 0.1) ${shimmerPosition + 20}%, 
      rgba(0, 163, 255, 0.05) 100%
    )`,
    borderRadius: variant === "circular" ? "50%" : "8px",
    width,
    height,
    position: "relative" as const,
    overflow: "hidden" as const,
  };

  const renderVariant = () => {
    switch (variant) {
      case "text":
        return (
          <div className={`luxury-skeleton-text ${className}`} style={{ width }}>
            {Array.from({ length: lines }).map((_, i) => (
              <div
                key={i}
                style={{
                  ...baseStyle,
                  height: "16px",
                  marginBottom: i < lines - 1 ? "12px" : "0",
                  width: i === lines - 1 ? "70%" : "100%",
                }}
              />
            ))}
          </div>
        );

      case "circular":
        return (
          <div
            className={`luxury-skeleton-circular ${className}`}
            style={baseStyle}
          />
        );

      case "card":
        return (
          <div
            className={`luxury-skeleton-card ${className}`}
            style={{
              ...baseStyle,
              padding: "24px",
              minHeight: "200px",
            }}
          >
            <div
              style={{
                ...baseStyle,
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                marginBottom: "16px",
              }}
            />
            <div
              style={{
                ...baseStyle,
                width: "80%",
                height: "24px",
                marginBottom: "12px",
              }}
            />
            <div
              style={{
                ...baseStyle,
                width: "100%",
                height: "16px",
                marginBottom: "8px",
              }}
            />
            <div
              style={{
                ...baseStyle,
                width: "90%",
                height: "16px",
              }}
            />
          </div>
        );

      case "rectangular":
      default:
        return (
          <div
            className={`luxury-skeleton-rectangular ${className}`}
            style={baseStyle}
          />
        );
    }
  };

  return (
    <div className="luxury-skeleton" style={{ position: "relative" }}>
      {renderVariant()}
    </div>
  );
}
