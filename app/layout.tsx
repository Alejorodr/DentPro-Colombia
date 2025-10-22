import Script from "next/script";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { AppProviders } from "./providers";

const initThemeScript = `(() => {
  const storageKey = "dentpro-theme";
  const classList = document.documentElement.classList;
  const mediaQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  let theme = "light";

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark") {
      theme = stored;
    } else if (mediaQuery?.matches) {
      theme = "dark";
    }
  } catch (_error) {
    if (mediaQuery?.matches) {
      theme = "dark";
    }
  }

  if (theme === "dark") {
    classList.add("dark");
  } else {
    classList.remove("dark");
  }
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=optional"
          rel="stylesheet"
        />
      </head>
      <body>
        <Script id="init-theme" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: initThemeScript }} />
        <AppProviders>
          {children}
          <Analytics />
          <SpeedInsights />
        </AppProviders>
      </body>
    </html>
  );
}
