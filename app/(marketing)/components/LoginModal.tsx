"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEventHandler } from "react";
import { createPortal } from "react-dom";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

const rolePortals = [
  {
    name: "Pacientes",
    description:
      "Consulta tu historia clínica, gestiona citas y recibe recordatorios personalizados.",
    href: "/portal/pacientes",
    icon: "favorite",
  },
  {
    name: "Profesionales",
    description:
      "Accede a tu agenda, firma evoluciones clínicas y colabora con el equipo interdisciplinario.",
    href: "/portal/profesionales",
    icon: "stethoscope",
  },
  {
    name: "Administración",
    description:
      "Gestiona sedes, indicadores, facturación y la experiencia integral de los pacientes.",
    href: "/portal/administracion",
    icon: "monitoring",
  },
] as const;

const focusableSelectors = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([type=hidden]):not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function LoginModal({ open, onClose }: LoginModalProps) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }

      if (event.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const focusable = dialog.querySelectorAll<HTMLElement>(focusableSelectors);
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      emailRef.current?.focus();
    }, 50);

    return () => window.clearTimeout(timer);
  }, [open]);

  const handleBackdropClick = () => {
    onClose();
  };

  const handleDialogClick: MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div className="modal-backdrop" role="presentation" onClick={handleBackdropClick} aria-hidden={!open}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="loginModalTitle"
        aria-describedby="loginModalDescription"
        id="loginModal"
        className="modal-content"
        onClick={handleDialogClick}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar panel de ingreso">
          <span className="material-symbols-rounded" aria-hidden="true">
            close
          </span>
        </button>
        <div className="modal-grid">
          <section className="modal-card space-y-6">
            <header className="space-y-3">
              <span className="badge">Portal unificado</span>
              <h2 id="loginModalTitle" className="text-2xl font-semibold text-slate-900 dark:text-white">
                Inicia sesión y continúa tu experiencia con DentPro
              </h2>
              <p id="loginModalDescription" className="text-sm text-slate-600 dark:text-slate-400">
                Desde aquí centralizamos el acceso seguro a los portales exclusivos para pacientes, profesionales y
                administradores. Escoge tu rol y utiliza tus credenciales para continuar.
              </p>
            </header>

            <div className="rounded-3xl border border-brand-light/70 bg-white/70 p-6 shadow-inner shadow-brand-teal/10 backdrop-blur dark:border-surface-muted/70 dark:bg-surface-base/80 dark:shadow-surface-dark">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Accesos directos por rol</h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Selecciona el portal que necesitas para ir directamente al entorno correspondiente.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {rolePortals.map((role) => (
                  <Link
                    key={role.name}
                    href={role.href}
                    className="group flex h-full flex-col justify-between rounded-2xl border border-brand-light/60 bg-white/80 p-4 transition hover:-translate-y-1 hover:border-brand-teal hover:shadow-xl hover:shadow-brand-teal/20 dark:border-surface-muted/70 dark:bg-surface-base/90 dark:hover:border-accent-cyan dark:hover:shadow-glow-dark"
                  >
                    <div className="space-y-2">
                      <span className="material-symbols-rounded inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-light/80 text-brand-teal transition group-hover:bg-brand-teal group-hover:text-white dark:bg-accent-cyan/20 dark:text-accent-cyan dark:group-hover:bg-accent-cyan dark:group-hover:text-surface-base">
                        {role.icon}
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{role.name}</h4>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{role.description}</p>
                      </div>
                    </div>
                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-teal transition group-hover:gap-2 group-hover:text-brand-indigo dark:text-accent-cyan dark:group-hover:text-white">
                      Ir al portal
                      <span className="material-symbols-rounded text-sm" aria-hidden="true">
                        arrow_outward
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="modal-card space-y-6">
            <header className="space-y-1">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Ingresa con tus credenciales</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Para proteger tu información utilizamos autenticación multifactor. Después de ingresar tus datos te
                enviaremos un código de verificación.
              </p>
            </header>
            <form className="space-y-5" action="#" method="post">
              <div className="space-y-2">
                <label htmlFor="modal-email" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Correo electrónico
                </label>
                <input
                  id="modal-email"
                  name="email"
                  type="email"
                  required
                  placeholder="tucorreo@dentpro.co"
                  className="input"
                  autoComplete="email"
                  ref={emailRef}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="modal-password" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Contraseña
                </label>
                <input
                  id="modal-password"
                  name="password"
                  type="password"
                  required
                  placeholder="Ingresa tu contraseña"
                  className="input"
                  autoComplete="current-password"
                />
                <div className="flex justify-end">
                  <Link
                    href="/recuperar"
                    className="text-sm font-semibold text-brand-teal transition hover:text-brand-indigo dark:text-accent-cyan dark:hover:text-white"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="modal-role" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Ingresa como
                </label>
                <select id="modal-role" name="role" className="input" defaultValue="paciente">
                  <option value="paciente">Paciente</option>
                  <option value="profesional">Profesional</option>
                  <option value="administracion">Administración</option>
                </select>
              </div>
              <button type="submit" className="btn-primary w-full justify-center">
                Iniciar sesión
              </button>
            </form>
            <footer className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <p>
                ¿No tienes usuario aún? Escríbenos a
                <a
                  href="mailto:soporte@dentprocol.com"
                  className="font-semibold text-brand-teal transition hover:text-brand-indigo dark:text-accent-cyan dark:hover:text-white"
                >
                  soporte@dentprocol.com
                </a>
                y te ayudaremos a crearlo.
              </p>
              <p className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-500">
                <span className="material-symbols-rounded text-base" aria-hidden="true">
                  shield_lock
                </span>
                Protegemos tus datos siguiendo normas de bioseguridad digital y cifrado de extremo a extremo.
              </p>
            </footer>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
