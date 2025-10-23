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
              const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
              const applyTheme = (theme) => {
                root.classList.toggle("dark", theme === "dark");
                root.dataset.theme = theme;
              };
              const readStoredTheme = () => {
                try {
                  const value = window.localStorage.getItem("theme");
                  return value === "dark" || value === "light" ? value : null;
                } catch (_storageError) {
                  return null;
                }
              };
              const hasManualPreference = () => readStoredTheme() !== null;

              const initialTheme = readStoredTheme() ?? (mediaQuery.matches ? "dark" : "light");
              applyTheme(initialTheme);

              if (!hasManualPreference()) {
                const handleChange = (event) => {
                  if (hasManualPreference()) {
                    return;
                  }

                  applyTheme(event.matches ? "dark" : "light");
                };

                if (typeof mediaQuery.addEventListener === "function") {
                  mediaQuery.addEventListener("change", handleChange);
                } else if (typeof mediaQuery.addListener === "function") {
                  mediaQuery.addListener(handleChange);
                }
              }
            } catch (_error) {
              const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
              const theme = prefersDark ? "dark" : "light";
              document.documentElement.classList.toggle("dark", prefersDark);
              document.documentElement.dataset.theme = theme;
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
