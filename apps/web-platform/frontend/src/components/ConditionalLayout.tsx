"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LayoutWrapper from "@/components/LayoutWrapper";

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");
  const isHomePage = pathname === "/";
  const showPublicPageBackground = !isAdminRoute && !isHomePage;

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {showPublicPageBackground ? (
        <div className="pointer-events-none fixed inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90"
            style={{
              backgroundImage: "url('/images/page.jpg.png')",
              filter: "brightness(1.08)",
            }}
          />
          <div className="absolute inset-0 bg-slate-950/70" />
        </div>
      ) : null}
      <div className="relative z-10 flex min-h-screen w-full flex-col">
        {!isAdminRoute && (
          <LayoutWrapper>
            <Header />
          </LayoutWrapper>
        )}
        <main className="flex-1 w-full">{children}</main>
        {!isAdminRoute && (
          <LayoutWrapper>
            <Footer />
          </LayoutWrapper>
        )}
      </div>
    </div>
  );
}
