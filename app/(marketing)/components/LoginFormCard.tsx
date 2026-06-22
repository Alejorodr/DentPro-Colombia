"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { getSession, signIn, useSession } from "next-auth/react";
import { ArrowRight, EnvelopeSimple, Lock, ShieldCheck, WarningCircle } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";

import { isUserRole, resolveRoleAwarePortalPath, type UserRole } from "@/lib/auth/roles";

const errorMessages: Record<string, string> = {
  CredentialsSignin: "Correo o contraseña incorrectos.",
  InvalidEmail: "Debes ingresar un correo válido.",
  NetworkError: "No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.",
  SessionRequired: "Tu sesión expiró. Inicia sesión nuevamente.",
  OAuthSignin: "No pudimos iniciar sesión con Google. Inténtalo de nuevo.",
  AccessDenied: "Tu cuenta de Google no cumple los requisitos de acceso.",
  Default: "No pudimos procesar tu solicitud. Inténtalo más tarde.",
};

interface LoginFormCardProps {
  callbackUrl?: string | null;
  onSuccess?: () => void;
  heading?: string;
  description?: string;
  showBackLink?: boolean;
  autoFocusEmail?: boolean;
  googleEnabled?: boolean;
}

export function LoginFormCard({
  callbackUrl,
  onSuccess,
  heading = "Inicia sesión en DentPro",
  description = "Usa las credenciales que te compartió el equipo administrador para acceder a tu tablero.",
  showBackLink = true,
  autoFocusEmail = false,
  googleEnabled = false,
}: LoginFormCardProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resolveDestination = useCallback(
    (role: UserRole) => resolveRoleAwarePortalPath(role, callbackUrl),
    [callbackUrl],
  );

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.trim().length > 0 && !isSubmitting,
    [email, isSubmitting, password],
  );

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    const roleCandidate = session?.user?.role ?? "";
    if (!isUserRole(roleCandidate)) {
      return;
    }

    const destination = resolveDestination(roleCandidate);
    router.replace(destination);
    router.refresh();
  }, [resolveDestination, router, session?.user?.role, status]);


  const handleGoogleSignIn = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      await signIn("google", {
        redirectTo: callbackUrl ?? undefined,
      });
      // Reached only when signIn returns without redirecting (provider not configured server-side).
      setFormError(errorMessages.OAuthSignin);
    } catch {
      setFormError(errorMessages.OAuthSignin);
    } finally {
      setIsSubmitting(false);
    }
  };
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

    let result: Awaited<ReturnType<typeof signIn>>;
    try {
      result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
    } catch {
      setFormError(errorMessages.NetworkError);
      setIsSubmitting(false);
      return;
    }

    if (result?.error) {
      const baseMessage = errorMessages[result.error] ?? errorMessages.Default;
      const extraMessage =
        result.error === "CredentialsSignin" ? "" : " Error de configuración o servidor. Intenta más tarde.";
      setFormError(`${baseMessage}${extraMessage}`);
      if (process.env.NODE_ENV !== "production") {
        console.warn("[login] signIn error", result);
      }
      setIsSubmitting(false);
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      try {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        console.info("[login] session check", { status: sessionResponse.status });
      } catch (error) {
        console.warn("[login] session check failed", error);
      }
    }

    let resolvedSession = await getSession();
    if (!resolvedSession?.user?.role) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      resolvedSession = await getSession();
    }
    const roleCandidate = resolvedSession?.user?.role ?? "";

    if (isUserRole(roleCandidate)) {
      const destination = resolveDestination(roleCandidate);
      onSuccess?.();
      router.replace(destination);
      router.refresh();
    } else {
      setFormError(errorMessages.Default);
      if (process.env.NODE_ENV !== "production") {
        console.warn("[login] session missing role after successful signIn", { resolvedSession });
      }
    }

    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6 rounded-[1.75rem] border border-white/70 bg-white/90 p-8 shadow-xl shadow-slate-900/10 transition-colors duration-300 dark:border-surface-muted/60 dark:bg-surface-base/85 dark:shadow-surface-dark">
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
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100" role="alert" aria-live="assertive">
          <WarningCircle className="mt-0.5 h-5 w-5" weight="bold" aria-hidden="true" />
          <div>
            <p className="font-semibold">No se pudo iniciar sesión</p>
            <p className="text-red-700 dark:text-red-100/90">{formError}</p>
          </div>
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit} aria-busy={isSubmitting}>
        {isHydrated ? <span className="sr-only" data-testid="login-form-ready">ready</span> : null}
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
              data-testid="login-email"
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
              data-testid="login-password"
            />
          </div>
        </label>

        {googleEnabled ? (
          <>
            <Button type="button" className="h-12 w-full" disabled={isSubmitting} onClick={handleGoogleSignIn}>
              Continuar con Google
            </Button>

            <div className="flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-slate-200 dark:bg-surface-muted/60" />
              <span className="text-xs uppercase tracking-wide text-slate-500">o</span>
              <span className="h-px flex-1 bg-slate-200 dark:bg-surface-muted/60" />
            </div>
          </>
        ) : null}

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

        <Button
          type="submit"
          className="h-12 w-full"
          disabled={!canSubmit}
          isLoading={isSubmitting}
          data-testid="login-submit"
        >
          {!isSubmitting && <ArrowRight className="h-4 w-4" weight="bold" aria-hidden="true" />}
          {isSubmitting ? "Validando credenciales..." : "Ingresar"}
        </Button>

        <p className="text-center text-sm text-slate-600 dark:text-slate-300">
          ¿No tienes cuenta?{" "}
          <Link href="/auth/register" className="font-semibold text-brand-teal transition-colors hover:text-brand-indigo dark:text-accent-cyan">
            Regístrate gratis
          </Link>
        </p>
      </form>

      <p className="text-center text-xs text-slate-500 dark:text-slate-300">
        ¿Necesitas ayuda? Escribe a soporte@dentpro.co indicando tu clínica y rol.
      </p>
    </div>
  );
}
