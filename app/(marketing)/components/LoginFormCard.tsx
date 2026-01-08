"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { ArrowRight, EnvelopeSimple, Lock, ShieldCheck, WarningCircle } from "@phosphor-icons/react";

import { getDefaultDashboardPath } from "@/lib/auth/roles";

const errorMessages: Record<string, string> = {
  CredentialsSignin: "Correo o contraseña incorrectos.",
  InvalidEmail: "Debes ingresar un correo válido.",
  Default: "No pudimos procesar tu solicitud. Inténtalo más tarde.",
};

interface LoginFormCardProps {
  callbackUrl?: string | null;
  onSuccess?: () => void;
  heading?: string;
  description?: string;
  showBackLink?: boolean;
  autoFocusEmail?: boolean;
}

export function LoginFormCard({
  callbackUrl,
  onSuccess,
  heading = "Inicia sesión en DentPro",
  description = "Usa las credenciales que te compartió el equipo administrador para acceder a tu tablero.",
  showBackLink = true,
  autoFocusEmail = false,
}: LoginFormCardProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.trim().length > 0 && !isSubmitting,
    [email, isSubmitting, password],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: callbackUrl ?? "/",
    });

    if (result?.error) {
      setFormError(errorMessages[result.error] ?? errorMessages.Default);
      setIsSubmitting(false);
      return;
    }

    const destination = result?.url ?? callbackUrl ?? getDefaultDashboardPath("PACIENTE");
    onSuccess?.();
    router.push(destination);
    router.refresh();
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6 rounded-2xl bg-white p-8 shadow-lg shadow-brand-teal/10 ring-1 ring-slate-200 transition-colors duration-300 dark:bg-surface-base dark:ring-surface-muted">
      <div className="space-y-2 text-left">
        <p className="inline-flex items-center gap-2 rounded-full bg-brand-light/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:bg-surface-muted/70 dark:text-accent-cyan">
          <Lock className="h-4 w-4" weight="bold" aria-hidden="true" />
          Acceso seguro
        </p>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{heading}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">{description}</p>
        </div>
      </div>

      {formError ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100" role="alert">
          <WarningCircle className="mt-0.5 h-5 w-5" weight="bold" aria-hidden="true" />
          <div>
            <p className="font-semibold">No se pudo iniciar sesión</p>
            <p className="text-red-700 dark:text-red-100/90">{formError}</p>
          </div>
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-1.5 text-left" htmlFor="login-email">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Correo electrónico
          </span>
          <div className="relative">
            <EnvelopeSimple className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              autoFocus={autoFocusEmail}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input h-12 pl-10 text-sm"
              placeholder="tu-correo@dentpro.co"
            />
          </div>
        </label>

        <label className="block space-y-1.5 text-left" htmlFor="login-password">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Contraseña
          </span>
          <div className="relative">
            <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input h-12 pl-10 text-sm"
              placeholder="Ingresa tu contraseña"
            />
          </div>
        </label>

        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
          <div className="space-x-2">
            <span className="font-semibold uppercase tracking-wide">Recordatorio</span>
            <span>Si tienes roles múltiples, te enviaremos al tablero correcto automáticamente.</span>
          </div>
          {showBackLink ? (
            <Link href="/" className="font-semibold text-brand-teal transition-colors hover:text-brand-indigo dark:text-accent-cyan">
              Volver al inicio
            </Link>
          ) : null}
        </div>

        <button
          type="submit"
          className="btn-primary w-full justify-center gap-2 text-sm"
          disabled={!canSubmit}
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" aria-hidden="true" />
              Validando credenciales...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <ArrowRight className="h-4 w-4" weight="bold" aria-hidden="true" />
              Ingresar
            </span>
          )}
        </button>
      </form>

      <p className="text-center text-xs text-slate-500 dark:text-slate-300">
        ¿Necesitas ayuda? Escribe a soporte@dentpro.co indicando tu clínica y rol.
      </p>
    </div>
  );
}
