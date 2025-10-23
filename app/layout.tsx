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

              if (storedTheme === "dark" || storedTheme === "light") {
                root.classList.toggle("dark", storedTheme === "dark");
                root.dataset.theme = storedTheme;
              } else {
                const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                const theme = prefersDark ? "dark" : "light";

                root.classList.toggle("dark", theme === "dark");
                root.dataset.theme = theme;
                window.localStorage.removeItem("theme");
              }
            } catch (_error) {
              const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

              if (prefersDark) {
                document.documentElement.classList.add("dark");
                document.documentElement.dataset.theme = "dark";
              } else {
                document.documentElement.classList.remove("dark");
                document.documentElement.dataset.theme = "light";
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
