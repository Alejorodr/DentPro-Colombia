import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Acceso DentPro",
  description:
    "Inicia sesión desde cualquier página con la burbuja flotante: detectamos tu rol automáticamente para llevarte al tablero correcto.",
};

export default function LoginPage() {
  redirect("/?auth=1");

  return null;
}
