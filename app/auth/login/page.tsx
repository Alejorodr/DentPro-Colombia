import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/auth";
import { Alert } from "@/components/ui/Alert";
import { ArrowLeft, Bell, CalendarCheck, ClipboardText, DeviceMobile } from "@/components/ui/Icon";
import { resolveRoleAwarePortalPath } from "@/lib/auth/roles";
import { LoginForm } from "@/app/(marketing)/login/LoginForm";
import PwaInstallButton from "@/components/PwaInstallButton";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

type LoginPageProps = {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
};

const benefits = [
  {
    icon: CalendarCheck,
    label: "Agenda citas en segundos",
    detail: "Confirma tu turno en línea, sin llamadas ni esperas.",
  },
  {
    icon: ClipboardText,
    label: "Historial clínico siempre disponible",
    detail: "Accede a tus resultados y recetas desde cualquier lugar.",
  },
  {
    icon: Bell,
    label: "Recordatorios automáticos",
    detail: "Te avisamos antes de cada cita para que no pierdas tu turno.",
  },
];

export default async function AuthLoginPage(props: any) {
  const resolvedProps = props as LoginPageProps;
  const searchParams = (await resolvedProps?.searchParams) ?? {};
  const errorParam = typeof searchParams?.error === "string" ? searchParams.error : null;
  const registeredParam = searchParams?.registered === "1";
  const errorMessages: Record<string, string> = {
    CredentialsSignin: "Correo o contraseña incorrectos.",
    InvalidEmail: "Debes ingresar un correo válido.",
    SessionRequired: "Tu sesión expiró. Vuelve a iniciar sesión.",
    AccessDenied: "No tienes permisos para acceder a este recurso.",
  };
  const loginErrorMessage = errorParam ? errorMessages[errorParam] ?? "No pudimos iniciar sesión." : null;
  const callbackUrlRaw = searchParams?.callbackUrl;
  const callbackUrl = typeof callbackUrlRaw === "string" && callbackUrlRaw.trim().length > 0 ? callbackUrlRaw : undefined;
  const session = await auth();
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  if (session?.user?.role) {
    redirect(resolveRoleAwarePortalPath(session.user.role, callbackUrl));
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

          {/* ── Left column — brand & benefits ─────────────────── */}
          <div className="space-y-10 pt-2">

            {/* Brand block */}
            <div className="space-y-4">
              <span className="badge">Portal clínico</span>
              <div className="space-y-3">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white lg:text-5xl">
                  Tu salud dental,<br className="hidden sm:block" /> siempre a la mano.
                </h1>
                <p className="max-w-md text-base leading-relaxed text-slate-600 dark:text-slate-300">
                  Ingresa a tu cuenta para gestionar citas, revisar tu historial y comunicarte con tu odontólogo.
                </p>
              </div>
            </div>

            {/* Benefits */}
            <ul className="space-y-5" aria-label="Beneficios del portal clínico">
              {benefits.map((b) => (
                <li key={b.label} className="flex items-start gap-4">
                  <div className="icon-badge mt-0.5 shrink-0 bg-brand-light text-brand-teal dark:bg-surface-elevated dark:text-accent-cyan">
                    <b.icon className="h-5 w-5" weight="fill" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{b.label}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{b.detail}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* PWA install card */}
            <div className="rounded-2xl border border-brand-sky/20 bg-gradient-to-br from-brand-light/60 to-white/60 p-5 backdrop-blur-sm dark:border-surface-muted dark:from-surface-elevated/80 dark:to-surface-base/60">
              <div className="flex items-start gap-4">
                <div className="icon-circle shrink-0 bg-brand-teal/10 text-brand-teal dark:bg-surface-muted dark:text-accent-cyan">
                  <DeviceMobile className="h-6 w-6" weight="fill" aria-hidden="true" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Accede más rápido como app
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      Instala DentPro en tu teléfono o escritorio y abre el portal con un toque, sin buscar la página.
                    </p>
                  </div>
                  <PwaInstallButton />
                </div>
              </div>
            </div>

          </div>

          {/* ── Right column — form ─────────────────────────────── */}
          <div className="space-y-4">
            {registeredParam ? (
              <Alert
                variant="success"
                title="Cuenta creada"
                description="Tu cuenta fue creada. Inicia sesión con tus credenciales."
              />
            ) : null}
            {loginErrorMessage ? (
              <Alert
                variant="error"
                title="No se pudo iniciar sesión"
                description={loginErrorMessage}
              />
            ) : null}
            <LoginForm
              callbackUrl={callbackUrl}
              googleEnabled={googleEnabled}
              showBackLink={false}
              autoFocusEmail
            />
          </div>

        </div>
      </div>
    </div>
  );
}
