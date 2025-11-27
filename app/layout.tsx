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
            const root = document.documentElement;
            const storageKey = "theme";

            const applyTheme = (theme, persist) => {
              root.classList.toggle("dark", theme === "dark");
              root.dataset.theme = theme;
              root.style.colorScheme = theme;

              if (!persist) {
                return;
              }

              try {
                window.localStorage.setItem(storageKey, theme);
              } catch (_error) {
                // Ignore storage errors (e.g., private mode).
              }
            };

            try {
              const storedTheme = window.localStorage.getItem(storageKey);

              if (storedTheme === "light" || storedTheme === "dark") {
                applyTheme(storedTheme, true);
                return;
              }
            } catch (_error) {
              // If storage is unavailable, fall back to system preference below.
            }

            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            const theme = prefersDark ? "dark" : "light";

            applyTheme(theme, false);

            try {
              window.localStorage.removeItem(storageKey);
            } catch (_error) {
              // Ignore storage errors (e.g., private mode).
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
