import Script from "next/script";
import { Suspense } from "react";
import { headers } from "next/headers";
import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { AppProviders } from "./providers";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dentprocolombia.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DentPro Colombia | Clínica dental especializada",
    template: "%s | DentPro Colombia",
  },
  description:
    "DentPro Colombia: odontología especializada con agendamiento en línea, atención humana y seguimiento clínico seguro.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: "/",
    siteName: "DentPro Colombia",
    title: "DentPro Colombia | Clínica dental especializada",
    description:
      "Odontología especializada con agendamiento en línea, atención humana y seguimiento clínico seguro.",
  },
  twitter: {
    card: "summary_large_image",
    title: "DentPro Colombia | Clínica dental especializada",
    description:
      "Odontología especializada con agendamiento en línea, atención humana y seguimiento clínico seguro.",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestId = (await headers()).get("x-request-id") ?? undefined;
  const shouldLoadVercelInsights = process.env.VERCEL === "1" && process.env.RUN_E2E !== "1";
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
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0b0b0f" media="(prefers-color-scheme: dark)" />
      </head>
      <body className="min-h-screen bg-white dark:bg-surface-base" data-request-id={requestId}>
        <Suspense fallback={null}>
          <AppProviders>
            {children}
            {shouldLoadVercelInsights ? (
              <>
                <Analytics />
                <SpeedInsights />
              </>
            ) : null}
          </AppProviders>
        </Suspense>
      </body>
    </html>
  );
}
