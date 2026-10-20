import ThemeProvider from "@/components/shadcn/ThemeProvider";
import { LanguageProvider } from "@/lib/LanguageContext";
import ConditionalLayout from "@/components/ConditionalLayout";
import { Analytics } from "@vercel/analytics/next";

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
        {/* Privacy-Friendly Cookieless Analytics (Umami) */}
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <script
            async
            defer
            src={process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL || "https://cloud.umami.is/script.js"}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
          />
        )}
        {/* Telegram Web App SDK for seamless Mini App integration */}
        <script src="https://telegram.org/js/telegram-web-app.js" async />
        <Analytics />
      </body>
    </html>
  );
}
