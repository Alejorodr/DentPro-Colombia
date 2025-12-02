import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, UsersThree } from "@phosphor-icons/react";

import { auth } from "@/auth";
import { getDefaultDashboardPath } from "@/lib/auth/roles";

import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Acceso DentPro",
  description:
    "Inicia sesión con tu cuenta profesional o administrativa y continúa al tablero correspondiente.",
};

type LoginPageProps = {
  searchParams?: { callbackUrl?: string };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const callbackUrl = typeof searchParams?.callbackUrl === "string" ? searchParams.callbackUrl : null;

  if (session) {
    redirect(callbackUrl ?? getDefaultDashboardPath(session.user.role));
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 py-12 transition-colors duration-300 dark:from-surface-base dark:via-surface-base dark:to-surface-base">
      <div className="container mx-auto max-w-5xl px-6">
        <div className="mb-10 flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">DentPro Colombia</p>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Accede a tu tablero</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Usa tus credenciales asignadas para entrar a la agenda, pacientes y reportes según tu rol.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-brand-teal hover:text-brand-teal dark:border-surface-muted dark:bg-surface-elevated dark:text-slate-200 dark:hover:border-accent-cyan dark:hover:text-accent-cyan"
          >
            Volver al sitio
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl bg-brand-teal px-8 py-10 text-white shadow-xl shadow-brand-teal/20">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              <UsersThree className="h-4 w-4" weight="bold" aria-hidden="true" />
              Roles admitidos
            </div>
            <h2 className="mt-4 text-2xl font-semibold">Pacientes, profesionales, recepción y admins</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/90">
              Validamos tus permisos y te enviamos directamente al tablero que corresponde con tu rol. Si tienes varios roles,
              priorizamos el principal para evitar errores de navegación.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-white/90">
              <li className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4" weight="bold" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Sesión protegida</p>
                  <p className="text-white/80">Cookies HTTP-only y validación del servidor mantienen tu acceso seguro.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4" weight="bold" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Redirección inteligente</p>
                  <p className="text-white/80">Si tu rol cambia, te llevamos al tablero correcto y evitamos errores de acceso.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4" weight="bold" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Soporte inmediato</p>
                  <p className="text-white/80">El equipo de DentPro puede restablecer tu clave o actualizar tus permisos.</p>
                </div>
              </li>
            </ul>
          </section>

          <section>
            <LoginForm callbackUrl={callbackUrl} />
          </section>
        </div>
      </div>
    </main>
  );
}
