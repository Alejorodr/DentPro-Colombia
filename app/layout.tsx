import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "DentPro Colombia",
  description: "Sitio oficial de DentPro Colombia"
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-white font-sans text-slate-900 antialiased dark:bg-surface-base dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
