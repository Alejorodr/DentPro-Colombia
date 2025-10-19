import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Acceso DentPro",
  description:
    "Inicia sesión desde cualquier página con la burbuja flotante: detectamos tu rol automáticamente para llevarte al tablero correcto.",
};

export default function LoginPage({ searchParams }: { searchParams: { callbackUrl?: string } }) {
  const callbackUrl = searchParams.callbackUrl;
  const destination = callbackUrl
    ? `/?auth=1&callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/?auth=1";

  redirect(destination);

  return null;
}
