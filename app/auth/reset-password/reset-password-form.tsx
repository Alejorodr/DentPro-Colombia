"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { fetchWithTimeout } from "@/lib/http";
import { PASSWORD_POLICY_MESSAGE, PASSWORD_POLICY_REGEX } from "@/lib/auth/password-policy";

type ResetPasswordFormProps = {
  token: string;
};

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return token.length > 0 && password.length > 0 && confirmPassword.length > 0 && !isSubmitting;
  }, [token, password, confirmPassword, isSubmitting]);

  const passwordPolicyOk = useMemo(() => PASSWORD_POLICY_REGEX.test(password), [password]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    if (!passwordPolicyOk) {
      setErrorMessage(PASSWORD_POLICY_MESSAGE);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetchWithTimeout("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message ?? "request_failed");
      }

      setStatusMessage("Contraseña actualizada. Ya puedes iniciar sesión con tu nueva clave.");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        router.push("/auth/login");
      }, 1200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos actualizar tu contraseña.";
      setErrorMessage(message || "No pudimos actualizar tu contraseña.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-surface-base">
      <div className="mx-auto w-full max-w-xl space-y-6 rounded-2xl bg-white p-8 shadow-lg shadow-brand-teal/10 ring-1 ring-slate-200 dark:bg-surface-base dark:ring-surface-muted">
        <div className="space-y-2 text-left">
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-light/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:bg-surface-muted/70 dark:text-accent-cyan">
            Nuevo acceso
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Restablecer contraseña</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Define una contraseña segura para volver a ingresar a tu cuenta.
          </p>
        </div>

        {!token ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
            El enlace no es válido. Solicita un nuevo correo de recuperación.
          </div>
        ) : null}
        {statusMessage ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100">
            {statusMessage}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100">
            {errorMessage}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1.5 text-left" htmlFor="reset-password">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Nueva contraseña
            </span>
            <input
              id="reset-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input h-12 text-sm"
              placeholder="Crea una contraseña segura"
            />
          </label>

          <label className="block space-y-1.5 text-left" htmlFor="reset-confirm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Confirmar contraseña
            </span>
            <input
              id="reset-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="input h-12 text-sm"
              placeholder="Repite tu contraseña"
            />
          </label>

          <p className="text-xs text-slate-500 dark:text-slate-400">{PASSWORD_POLICY_MESSAGE}</p>

          <button type="submit" className="btn-primary w-full justify-center text-sm" disabled={!canSubmit}>
            {isSubmitting ? "Actualizando..." : "Guardar contraseña"}
          </button>
        </form>

        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
          <Link href="/auth/login" className="font-semibold text-brand-teal transition-colors hover:text-brand-indigo dark:text-accent-cyan">
            Volver al login
          </Link>
          <span className="text-slate-400">El enlace expira en 60 minutos.</span>
        </div>
      </div>
    </main>
  );
}
