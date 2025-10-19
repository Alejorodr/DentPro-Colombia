"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useEffect, useRef, useState, type MouseEvent } from "react";

import { getDefaultDashboardPath, type UserRole } from "@/lib/auth/roles";

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

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!result || result.error) {
      setError("Credenciales no válidas. Intenta nuevamente.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("No se pudo obtener la sesión");
      }

      const session = (await response.json()) as {
        user?: { role?: UserRole | null } | null;
      };

      const userRole = (session.user?.role ?? "patient") as UserRole;
      onClose();
      router.push(getDefaultDashboardPath(userRole));
      router.refresh();
    } catch (sessionError) {
      console.error(sessionError);
      onClose();
      router.push("/admin");
      router.refresh();
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
        className="modal-content max-w-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="loginModalTitle"
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Cerrar panel de ingreso"
        >
          <span className="material-symbols-rounded" aria-hidden="true">
            close
          </span>
        </button>
        <div className="mx-auto max-w-md space-y-6">
          <header className="space-y-2 text-center">
            <h2
              id="loginModalTitle"
              className="text-2xl font-semibold text-slate-900 dark:text-white"
            >
              Ingresa a DentPro
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Accede con tus credenciales para administrar tus servicios.
            </p>
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
                placeholder="admin@dentpro.co"
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
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              className="btn-primary w-full justify-center text-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </form>
          <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
            Usuario demo: <span className="font-semibold text-brand-teal dark:text-accent-cyan">admin@dentpro.co</span> ·
            Contraseña: <span className="font-semibold text-brand-teal dark:text-accent-cyan">demo123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
