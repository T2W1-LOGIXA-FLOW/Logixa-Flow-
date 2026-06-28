"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer7 from "@/components/ui/footer-7";
import LayoutWrapper from "@/components/LayoutWrapper";

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  return (
    <div className="relative z-10 flex min-h-screen w-full flex-col">
      {!isAdminRoute && (
        <LayoutWrapper>
          <Header />
        </LayoutWrapper>
      )}
      <main className="flex-1 w-full">{children}</main>
      {!isAdminRoute && (
        <LayoutWrapper>
          <Footer7 />
        </LayoutWrapper>
      )}
    </div>
  );
}
