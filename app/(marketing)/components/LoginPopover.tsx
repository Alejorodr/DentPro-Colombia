"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useEffect, useRef, useState, type RefObject } from "react";

import { getDefaultDashboardPath, type UserRole } from "@/lib/auth/roles";

interface LoginPopoverProps {
  open: boolean;
  anchorRef: RefObject<HTMLButtonElement>;
  onClose: () => void;
}

export function LoginPopover({ open, anchorRef, onClose }: LoginPopoverProps) {
  const router = useRouter();
  const popoverRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      const button = anchorRef.current;
      const popover = popoverRef.current;
      if (!popover || !button) {
        return;
      }

      if (popover.contains(target as Node) || button.contains(target as Node)) {
        return;
      }

      onClose();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, anchorRef, onClose]);

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

  return (
    <div
      id="loginPopover"
      ref={popoverRef}
      className="absolute right-0 z-50 mt-3 w-80 max-w-xs rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-xl shadow-brand-teal/10 dark:border-surface-muted dark:bg-surface-elevated"
      role="dialog"
      aria-modal="false"
      aria-labelledby="loginPopoverTitle"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="loginPopoverTitle" className="text-base font-semibold text-slate-900 dark:text-white">
          Ingresa a DentPro
        </h2>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo dark:text-slate-400 dark:hover:bg-surface-muted"
          onClick={onClose}
          aria-label="Cerrar panel de ingreso"
        >
          <span className="material-symbols-rounded" aria-hidden="true">
            close
          </span>
        </button>
      </div>
      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label htmlFor="popover-email" className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Correo electrónico
          </label>
          <input
            id="popover-email"
            ref={emailRef}
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input h-10 text-sm"
            placeholder="admin@dentpro.co"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="popover-password" className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Contraseña
          </label>
          <input
            id="popover-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input h-10 text-sm"
            placeholder="Ingresa tu contraseña"
          />
        </div>
        {error ? <p className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p> : null}
        <button
          type="submit"
          className="btn-primary w-full justify-center text-sm"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>
      <p className="mt-4 text-[11px] text-slate-500 dark:text-slate-400">
        Usuario demo: <span className="font-semibold text-brand-teal dark:text-accent-cyan">admin@dentpro.co</span> · Contraseña: <span className="font-semibold text-brand-teal dark:text-accent-cyan">demo123</span>
      </p>
    </div>
  );
}
