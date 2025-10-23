import Script from "next/script";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { AppProviders } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <head>
        <Script id="theme" strategy="beforeInteractive">
          {`
            try {
              const THEME_KEY = "theme";
              const SOURCE_KEY = "theme-source";
              const storedTheme = window.localStorage.getItem(THEME_KEY);
              const storedSource = window.localStorage.getItem(SOURCE_KEY);
              const isKnownTheme = storedTheme === "light" || storedTheme === "dark";
              const hasManualPreference = storedSource === "manual" && isKnownTheme;
              const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
              const theme = hasManualPreference ? storedTheme : prefersDark ? "dark" : "light";
              const root = document.documentElement;

              root.classList.toggle("dark", theme === "dark");
              root.dataset.theme = theme;

              if (!hasManualPreference) {
                window.localStorage.removeItem(THEME_KEY);
                window.localStorage.removeItem(SOURCE_KEY);
              }
            } catch (_error) {
              const root = document.documentElement;
              const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

              root.classList.toggle("dark", prefersDark);
              root.dataset.theme = prefersDark ? "dark" : "light";
            }
          `}
        </Script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=optional"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-white dark:bg-neutral-900">
        <AppProviders>
          {children}
          <Analytics />
          <SpeedInsights />
        </AppProviders>
      </body>
    </html>
  );
}
