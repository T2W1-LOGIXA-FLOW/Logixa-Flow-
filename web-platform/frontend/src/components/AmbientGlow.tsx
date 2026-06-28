"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function AmbientGlow() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isAdminRoute = pathname?.startsWith("/admin") || pathname?.startsWith("/api");
  if (isAdminRoute) return null;

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0 select-none">
      {/* Top-Left Subtle Cyan Glow */}
      <div className="absolute -top-[200px] -left-[200px] h-[600px] w-[600px] rounded-full bg-[#00a3ff]/[0.05] blur-[130px]" />
      
      {/* Bottom-Right Subtle Orange Glow */}
      <div className="absolute -bottom-[200px] -right-[200px] h-[600px] w-[600px] rounded-full bg-[#ff6b00]/[0.03] blur-[130px]" />
    </div>
  );
}
