import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Ingreso a portales DentPro",
  description:
    "Accede a los portales de pacientes, profesionales o administración de DentPro Colombia desde un único punto de entrada.",
};

export default function LoginPage() {
  redirect("/?auth=1");

  return null;
}
