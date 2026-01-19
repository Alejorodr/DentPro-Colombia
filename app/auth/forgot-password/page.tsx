"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { fetchWithTimeout } from "@/lib/http";
const genericMessage =
  "Si el correo existe, te enviaremos instrucciones para restablecer tu contraseña.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      setErrorMessage("Ingresa un correo válido.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetchWithTimeout("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("request_failed");
      }

      setStatusMessage(genericMessage);
    } catch {
      setErrorMessage("No pudimos procesar tu solicitud. Inténtalo más tarde.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-surface-base">
      <div className="mx-auto w-full max-w-xl space-y-6 rounded-2xl bg-white p-8 shadow-lg shadow-brand-teal/10 ring-1 ring-slate-200 dark:bg-surface-base dark:ring-surface-muted">
        <div className="space-y-2 text-left">
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-light/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:bg-surface-muted/70 dark:text-accent-cyan">
            Recuperación segura
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">¿Olvidaste tu contraseña?</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Ingresa el correo asociado a tu cuenta y te enviaremos un enlace seguro para restablecerla.
          </p>
        </div>

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
          <label className="block space-y-1.5 text-left" htmlFor="forgot-email">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Correo electrónico
            </span>
            <input
              id="forgot-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input h-12 text-sm"
              placeholder="kevinrodr@hotmail.com"
            />
          </label>

          <button type="submit" className="btn-primary w-full justify-center text-sm" disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Enviar enlace"}
          </button>
        </form>

        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
          <Link href="/auth/login" className="font-semibold text-brand-teal transition-colors hover:text-brand-indigo dark:text-accent-cyan">
            Volver al login
          </Link>
          <span className="text-slate-400">No compartas tu enlace con nadie.</span>
        </div>
      </div>
    </main>
  );
}
