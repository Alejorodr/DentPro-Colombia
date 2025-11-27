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

            const mediaQuery = window.matchMedia
              ? window.matchMedia("(prefers-color-scheme: dark)")
              : null;
            const getSystemTheme = () =>
              mediaQuery && mediaQuery.matches ? "dark" : "light";

            const applyStoredOrSystemTheme = () => {
              try {
                const storedTheme = window.localStorage.getItem(storageKey);

                if (storedTheme === "light" || storedTheme === "dark") {
                  applyTheme(storedTheme, true);
                  return;
                }
              } catch (_error) {
                // If storage is unavailable, fall back to system preference below.
              }

              applyTheme(getSystemTheme(), false);

              try {
                window.localStorage.removeItem(storageKey);
              } catch (_error) {
                // Ignore storage errors (e.g., private mode).
              }
            };

            applyStoredOrSystemTheme();

            const applyMediaChange = (event) => {
              try {
                const storedTheme = window.localStorage.getItem(storageKey);

                if (storedTheme === "light" || storedTheme === "dark") {
                  return;
                }
              } catch (_error) {
                // If storage is unavailable, fall back to system preference below.
              }

              applyTheme(event.matches ? "dark" : "light", false);
            };

            if (mediaQuery) {
              if (typeof mediaQuery.addEventListener === "function") {
                mediaQuery.addEventListener("change", applyMediaChange);
              } else if (typeof mediaQuery.addListener === "function") {
                mediaQuery.addListener(applyMediaChange);
              }
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
