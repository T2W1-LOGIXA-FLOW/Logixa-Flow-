"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function LayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  // Hide header/footer on admin routes and auth pages
  const isAdminOrAuth = pathname?.startsWith("/admin") || 
                       pathname?.startsWith("/login");
  
  if (isAdminOrAuth) {
    return null;
  }
  
  return <>{children}</>;
}
