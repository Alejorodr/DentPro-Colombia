import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/auth";
import { Alert } from "@/components/ui/Alert";
import { ArrowLeft } from "@/components/ui/Icon";
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
  { label: "Agenda citas en segundos", detail: "Confirma tu turno en línea, sin llamadas." },
  { label: "Historial clínico siempre disponible", detail: "Accede a tus resultados y recetas desde cualquier lugar." },
  { label: "Recordatorios automáticos", detail: "Te avisamos antes de cada cita para que no pierdas tu turno." },
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
          <div className="space-y-1">
            <p className="badge">Portal clínico</p>
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              Tu salud dental,<br />siempre a la mano.
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-300">
              Ingresa a tu cuenta para gestionar citas, revisar tu historial y comunicarte con tu odontólogo.
            </p>
          </div>
          <ul className="space-y-4">
            {benefits.map((b) => (
              <li key={b.label} className="flex items-start gap-3">
                <span className="icon-badge mt-0.5 shrink-0">
                  <span className="h-2 w-2 rounded-full bg-brand-teal dark:bg-accent-cyan" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{b.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{b.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Acceso rápido desde tu dispositivo
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Instala DentPro como app y accede con un toque, sin buscar la página.
            </p>
            <PwaInstallButton />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            ¿No tienes cuenta?{" "}
            <Link href="/auth/register" className="font-semibold text-brand-teal transition-colors hover:text-brand-indigo dark:text-accent-cyan">
              Regístrate gratis
            </Link>
          </p>
        </div>

        {/* Right — form column */}
        <div className="space-y-4">
          {registeredParam ? (
            <Alert variant="success" title="Cuenta creada" description="Tu cuenta fue creada. Inicia sesión con tus credenciales." />
          ) : null}
          {loginErrorMessage ? (
            <Alert variant="error" title="No se pudo iniciar sesión" description={loginErrorMessage} />
          ) : null}
          <LoginForm callbackUrl={callbackUrl} googleEnabled={googleEnabled} showBackLink={false} />
        </div>
      </div>
      </div>
    </div>
  );
}
