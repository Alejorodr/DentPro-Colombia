import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Material_Symbols_Rounded, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const materialSymbols = Material_Symbols_Rounded({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-material-symbols",
  display: "block",
});

export const metadata: Metadata = {
  title: "DentPro Colombia",
  description: "Sitio oficial de DentPro Colombia",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="es" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${materialSymbols.variable} bg-slate-50 font-sans text-slate-900 antialiased transition-colors duration-300 dark:bg-surface-base dark:text-slate-100`}
      >
        {children}
      </body>
    </html>
  );
}
