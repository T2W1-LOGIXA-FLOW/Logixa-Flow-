import ThemeProvider from "@/components/shadcn/ThemeProvider";
import { LanguageProvider } from "@/lib/LanguageContext";
import ConditionalLayout from "@/components/ConditionalLayout";

import "@/styles/globals.css";

export const metadata = {
  title: "Logixa Flow",
  description: "Smarter Supply Chain. Limitless Flow.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className="relative min-h-screen bg-background text-foreground antialiased overflow-x-hidden">
        {/* GoogleAnalytics disabled for now - will be configured in production */}
        <div className="logixa-main-bg logixa-luminous-overlay">
          <LanguageProvider>
            <ThemeProvider defaultTheme="dark">
              <ConditionalLayout>
                {children}
              </ConditionalLayout>
            </ThemeProvider>
          </LanguageProvider>
        </div>
      </body>
    </html>
  );
}
