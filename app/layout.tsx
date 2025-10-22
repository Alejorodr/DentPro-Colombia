import Script from "next/script";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { AppProviders } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=optional" rel="stylesheet"/>
      </head>
      <body>
        <AppProviders>
          {children}
          <Analytics />
          <SpeedInsights />
        </AppProviders>
        <Script src="/js/main.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
