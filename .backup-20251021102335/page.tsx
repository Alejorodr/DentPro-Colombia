import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Acceso DentPro",
  description:
    "Inicia sesión desde cualquier página con la burbuja flotante: detectamos tu rol automáticamente para llevarte al tablero correcto.",
};

type LoginPageProps = {
  searchParams?: Promise<{ callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const callbackUrl = resolvedSearchParams.callbackUrl;
  const destination = callbackUrl
    ? `/?auth=1&callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/?auth=1";

  redirect(destination);

  return null;
}




