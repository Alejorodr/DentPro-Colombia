import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/auth";
import { ArrowLeft } from "@/components/ui/Icon";
import { resolveRoleAwarePortalPath } from "@/lib/auth/roles";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description: "Regístrate en DentPro Colombia para agendar citas y gestionar tu historial clínico.",
};

const highlights = [
  { label: "Agenda en línea 24/7", detail: "Sin esperas ni llamadas telefónicas." },
  { label: "Historial clínico digital", detail: "Resultados y recetas siempre disponibles." },
  { label: "Recordatorios automáticos", detail: "Nunca pierdas una cita por olvido." },
];

export default async function RegisterPage() {
  const session = await auth();
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  if (session?.user?.role) {
    redirect(resolveRoleAwarePortalPath(session.user.role));
  }

  return (
    <div className="min-h-screen bg-hero-light px-4 py-14 transition-colors duration-300 dark:bg-hero-dark">
      <div className="mx-auto max-w-5xl space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-teal transition-colors hover:text-brand-indigo dark:text-accent-cyan"
      >
        <ArrowLeft className="h-4 w-4" weight="bold" aria-hidden="true" />
        Volver al inicio
      </Link>
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">

        {/* Left — brand column */}
        <div className="space-y-8 pt-2">
          <div>
            <p className="badge">Nuevo paciente</p>
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              Empieza tu cuidado dental hoy.
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-300">
              Crea tu cuenta gratuita y agenda tu primera valoración con los especialistas de DentPro Colombia.
            </p>
          </div>
          <ul className="space-y-4">
            {highlights.map((h) => (
              <li key={h.label} className="flex items-start gap-3">
                <span className="icon-badge mt-0.5 shrink-0">
                  <span className="h-2 w-2 rounded-full bg-brand-teal dark:bg-accent-cyan" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{h.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{h.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            ¿Ya tienes cuenta?{" "}
            <Link href="/auth/login" className="font-semibold text-brand-teal transition-colors hover:text-brand-indigo dark:text-accent-cyan">
              Inicia sesión
            </Link>
          </p>
        </div>

        {/* Right — form column */}
        <RegisterForm googleEnabled={googleEnabled} />
      </div>
      </div>
    </div>
  );
}
