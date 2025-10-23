"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState, type MouseEvent } from "react";

import { ChartLineUp, Lock, X } from "@phosphor-icons/react";

import { getDefaultDashboardPath, isUserRole, type UserRole } from "@/lib/auth/roles";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export function LoginModal({ open, onClose }: LoginModalProps) {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setTimeout(() => {
      emailRef.current?.focus();
    }, 40);

    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setPassword("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; user?: { role?: string | null } }
        | null;

      if (!response.ok || !data?.ok) {
        const errorCode = data?.error ?? "UNKNOWN_ERROR";
        if (response.status === 401 || errorCode === "INVALID_CREDENTIALS") {
          setError("Credenciales no válidas. Intenta nuevamente.");
        } else if (errorCode === "INVALID_REQUEST") {
          setError("Debes ingresar tu correo y contraseña.");
        } else {
          setError("Ocurrió un error al iniciar sesión. Intenta nuevamente más tarde.");
        }
        return;
      }

      const userRole = data.user?.role;
      const role: UserRole =
        typeof userRole === "string" && isUserRole(userRole) ? userRole : "patient";
      onClose();
      router.push(getDefaultDashboardPath(role));
      router.refresh();
    } catch (submitError) {
      console.error(submitError);
      setError("No pudimos contactar al servidor. Verifica tu conexión e inténtalo nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        id="loginModal"
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="loginModalTitle"
        aria-describedby="loginModalDescription"
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Cerrar panel de ingreso"
        >
          <X className="h-5 w-5" weight="bold" aria-hidden="true" />
        </button>
        <div className="modal-grid items-stretch">
          <section className="modal-card space-y-6">
            <header className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-light/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:bg-surface-muted/70 dark:text-accent-cyan">
                <Lock className="h-4 w-4" weight="bold" aria-hidden="true" />
                Acceso seguro
              </div>
              <div className="space-y-1">
                <h2
                  id="loginModalTitle"
                  className="text-2xl font-semibold text-slate-900 dark:text-white"
                >
                  Ingresa a DentPro
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Administra tus servicios clínicos con tus credenciales profesionales.
                </p>
              </div>
            </header>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="modal-email"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300"
                >
                  Correo electrónico
                </label>
                <input
                  id="modal-email"
                  ref={emailRef}
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="input h-12 text-sm"
                  placeholder="tu-correo@dentpro.co"
                />
              </div>
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="modal-password"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300"
                >
                  Contraseña
                </label>
                <input
                  id="modal-password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input h-12 text-sm"
                  placeholder="Ingresa tu contraseña"
                />
              </div>
              {error ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                    {error}
                  </p>
                </div>
              ) : null}
              <button
                type="submit"
                className="btn-primary w-full justify-center text-sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
              </button>
            </form>
          </section>
          <aside
            className="modal-card flex flex-col justify-between bg-gradient-to-br from-brand-sky/90 via-brand-teal/95 to-brand-indigo/95 text-white"
            id="loginModalDescription"
          >
            <div className="space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 shadow-lg shadow-brand-teal/30">
                <ChartLineUp className="h-6 w-6" weight="bold" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Control total de tu clínica</h3>
                <p className="text-sm text-white/90">
                  Visualiza tu agenda, asigna tratamientos y mantén informados a tus pacientes desde un único lugar.
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-sm backdrop-blur">
              <p className="font-semibold uppercase tracking-wide text-white/80">
                ¿Necesitas acceso?
              </p>
              <p className="mt-2 text-white/90">
                Utiliza las credenciales proporcionadas por tu clínica o solicita acceso al equipo administrador.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

