// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "./providers"; // si no existe, quita esta línea y el wrapper

export const metadata: Metadata = {
  title: "Dent Pro | Clínica Odontológica Digital en Chía",
  description:
    "Agenda tu cita por especialidad, conoce nuestros servicios y especialistas.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
        {/* Si no usas AppProviders, deja solo {children} */}
      </body>
    </html>
  );
}
