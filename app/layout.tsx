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

              try {
                if (persist) {
                  window.localStorage.setItem(storageKey, theme);
                } else {
                  window.localStorage.removeItem(storageKey);
                }
              } catch (_error) {
                // Ignore storage errors (e.g., private mode).
              }
            };

            const getStoredTheme = () => {
              try {
                const stored = window.localStorage.getItem(storageKey);
                return stored === "dark" || stored === "light" ? stored : null;
              } catch (_error) {
                return null;
              }
            };

            const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)") ?? null;
            const getSystemTheme = () => (mediaQuery?.matches ? "dark" : "light");

            const storedTheme = getStoredTheme();
            applyTheme(storedTheme ?? getSystemTheme(), Boolean(storedTheme));

            const applyMediaChange = (event) => {
              if (getStoredTheme()) {
                return;
              }

              applyTheme(event.matches ? "dark" : "light", false);
            };

            if (mediaQuery) {
              const add = mediaQuery.addEventListener ? "addEventListener" : "addListener";
              mediaQuery[add]("change", applyMediaChange);
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
