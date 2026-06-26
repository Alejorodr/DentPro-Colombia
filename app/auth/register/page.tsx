import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/auth";
import { ArrowLeft, Bell, CalendarCheck, ClipboardText, Tooth } from "@/components/ui/Icon";
import { resolveRoleAwarePortalPath } from "@/lib/auth/roles";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description: "Regístrate en DentPro Colombia para agendar citas y gestionar tu historial clínico.",
};

const highlights = [
  {
    icon: CalendarCheck,
    label: "Agenda en línea 24/7",
    detail: "Sin esperas ni llamadas telefónicas. Elige el turno que más te convenga.",
  },
  {
    icon: ClipboardText,
    label: "Historial clínico digital",
    detail: "Resultados, recetas y radiografías siempre disponibles desde tu cuenta.",
  },
  {
    icon: Bell,
    label: "Recordatorios automáticos",
    detail: "Nunca pierdas una cita por olvido. Te avisamos con anticipación.",
  },
];

export default async function RegisterPage() {
  const session = await auth();
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  if (session?.user?.role) {
    redirect(resolveRoleAwarePortalPath(session.user.role));
  }

  return (
    <div className="min-h-dvh bg-hero-light px-4 py-12 transition-colors duration-300 dark:bg-hero-dark sm:py-16">
      <div className="mx-auto max-w-6xl space-y-10">

        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-teal transition-colors hover:text-brand-indigo dark:text-accent-cyan"
        >
          <ArrowLeft className="h-4 w-4" weight="bold" aria-hidden="true" />
          Volver al inicio
        </Link>

        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-16">

          {/* ── Left column — brand & highlights ───────────────── */}
          <div className="space-y-10 pt-2">

            {/* Brand block */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="badge">Nuevo paciente</span>
                <div className="icon-badge bg-brand-light text-brand-teal dark:bg-surface-elevated dark:text-accent-cyan">
                  <Tooth className="h-4 w-4" weight="fill" aria-hidden="true" />
                </div>
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white lg:text-5xl">
                  Empieza tu cuidado<br className="hidden sm:block" /> dental hoy.
                </h1>
                <p className="max-w-md text-base leading-relaxed text-slate-600 dark:text-slate-300">
                  Crea tu cuenta gratuita y agenda tu primera valoración con los especialistas de DentPro Colombia.
                </p>
              </div>
            </div>

            {/* Highlights */}
            <ul className="space-y-5" aria-label="Beneficios de registrarte">
              {highlights.map((h) => (
                <li key={h.label} className="flex items-start gap-4">
                  <div className="icon-badge mt-0.5 shrink-0 bg-brand-light text-brand-teal dark:bg-surface-elevated dark:text-accent-cyan">
                    <h.icon className="h-5 w-5" weight="fill" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{h.label}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{h.detail}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Trust note */}
            <div className="rounded-2xl border border-brand-sky/20 bg-gradient-to-br from-brand-light/60 to-white/60 p-5 backdrop-blur-sm dark:border-surface-muted dark:from-surface-elevated/80 dark:to-surface-base/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
                Tu privacidad, protegida
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Tu información se almacena de forma segura y nunca se comparte con terceros sin tu autorización.
              </p>
            </div>

          </div>

          {/* ── Right column — form ─────────────────────────────── */}
          <RegisterForm googleEnabled={googleEnabled} />

        </div>
      </div>
    </div>
  );
}
