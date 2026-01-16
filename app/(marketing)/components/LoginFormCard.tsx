"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { getSession, signIn, useSession } from "next-auth/react";
import { ArrowRight, EnvelopeSimple, Lock, ShieldCheck, WarningCircle } from "@/components/ui/Icon";

import { getDefaultDashboardPath, isUserRole, type UserRole } from "@/lib/auth/roles";

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
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resolveRedirectPath = useCallback((candidate?: string | null) => {
    if (!candidate) {
      return null;
    }

    const trimmed = candidate.trim();
    if (!trimmed) {
      return null;
    }

    let path = trimmed;

    if (trimmed.startsWith("http")) {
      try {
        const parsed = new URL(trimmed);
        path = `${parsed.pathname}${parsed.search}`;
      } catch {
        return null;
      }
    }

    if (!path.startsWith("/")) {
      return null;
    }

    if (path === "/" || path.startsWith("/auth/login") || path.startsWith("/login")) {
      return null;
    }

    return path;
  }, []);

  const resolveDestination = useCallback(
    (role: UserRole) => {
      const roleDestination = getDefaultDashboardPath(role);
      const callbackDestination = resolveRedirectPath(callbackUrl);
      return callbackDestination ?? roleDestination;
    },
    [callbackUrl, resolveRedirectPath],
  );

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.trim().length > 0 && !isSubmitting,
    [email, isSubmitting, password],
  );

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    const roleCandidate = session?.user?.role ?? "";
    const resolvedRole = isUserRole(roleCandidate) ? roleCandidate : "PACIENTE";
    const destination = resolveDestination(resolvedRole);
    router.replace(destination);
    router.refresh();
  }, [resolveDestination, router, session?.user?.role, status]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setFormError(errorMessages[result.error] ?? errorMessages.Default);
      setIsSubmitting(false);
      return;
    }

    const resolvedSession = await getSession();
    const roleCandidate = resolvedSession?.user?.role ?? "";
    const resolvedRole = isUserRole(roleCandidate) ? roleCandidate : "PACIENTE";
    const destination = resolveDestination(resolvedRole);
    onSuccess?.();
    router.replace(destination);
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
              className="input h-12 pl-10 text-sm"
              placeholder="Ingresa tu contraseña"
            />
          </div>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
          <div className="space-x-2">
            <span className="font-semibold uppercase tracking-wide">Recordatorio</span>
            <span>Si tienes roles múltiples, te enviaremos al tablero correcto automáticamente.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/forgot-password" className="font-semibold text-brand-teal transition-colors hover:text-brand-indigo dark:text-accent-cyan">
              ¿Olvidaste tu contraseña?
            </Link>
            {showBackLink ? (
              <Link href="/" className="font-semibold text-brand-teal transition-colors hover:text-brand-indigo dark:text-accent-cyan">
                Volver al inicio
              </Link>
            ) : null}
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary w-full justify-center gap-2 text-sm"
          disabled={!canSubmit}
          aria-busy={isSubmitting}
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
