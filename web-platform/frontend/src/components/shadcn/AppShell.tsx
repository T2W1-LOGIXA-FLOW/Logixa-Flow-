"use client";

import React from "react";
import Header from "../Header";
import Footer from "../Footer";
import ThemeProvider from "@/components/shadcn/ThemeProvider";

type AppShellProps = {
  children: React.ReactNode;
};

// Minimal shadcn-style shell using Tailwind utility classes compatible with shadcn themes.
export default function AppShell({ children }: AppShellProps) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />
        <div className="flex-1 container mx-auto w-full px-4 py-6">
          <div className="rounded-lg bg-card shadow-sm p-6">{children}</div>
        </div>
        <Footer />
      </div>
    </ThemeProvider>
  );
}
