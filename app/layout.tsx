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
              const root = document.documentElement;
              const storedTheme = window.localStorage.getItem("theme");
              const isStoredTheme = storedTheme === "light" || storedTheme === "dark";
              const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
              const theme = isStoredTheme ? storedTheme : prefersDark ? "dark" : "light";
              const root = document.documentElement;

              root.classList.toggle("dark", theme === "dark");
              root.dataset.theme = theme;

              if (!isStoredTheme) {
                window.localStorage.removeItem("theme");
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
