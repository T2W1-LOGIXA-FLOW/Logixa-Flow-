"use client";

import { ReactNode } from "react";

interface BentoItemProps {
  children: ReactNode;
  className?: string;
  span?: "1" | "2" | "3" | "4";
}

export function BentoItem({ children, className = "", span = "1" }: BentoItemProps) {
  const spanClasses = {
    "1": "col-span-1",
    "2": "col-span-2",
    "3": "col-span-3",
    "4": "col-span-4",
  };

  return (
    <div
      className={`bento-item ${spanClasses[span]} ${className}`}
      style={{
        background: "linear-gradient(135deg, rgba(0, 163, 255, 0.05) 0%, rgba(255, 107, 0, 0.05) 100%)",
        border: "1px solid rgba(0, 163, 255, 0.1)",
        borderRadius: "16px",
        padding: "24px",
        transition: "all 0.3s ease",
      }}
    >
      {children}
    </div>
  );
}

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

export default function BentoGrid({ children, className = "" }: BentoGridProps) {
  return (
    <div
      className={`bento-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}
    >
      {children}
    </div>
  );
}
