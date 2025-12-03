"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { ChartLineUp, Lock, X } from "@phosphor-icons/react";

import { LoginFormCard } from "./LoginFormCard";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export function LoginModal({ open, onClose }: LoginModalProps) {
  const router = useRouter();
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    setPortalElement(document.body);
  }, []);

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

  if (!open || !portalElement) {
    return null;
  }

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleSuccess = () => {
    onClose();
    router.refresh();
  };

  return createPortal(
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

            <LoginFormCard
              onSuccess={handleSuccess}
              showBackLink={false}
              heading="Accede a tu tablero"
              description="Comparte tus credenciales para continuar con la gestión de la clínica."
              callbackUrl="/"
              autoFocusEmail
            />
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
                  Consolida la agenda, confirma asistencia y coordina a los especialistas desde un solo panel.
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-white/90">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-white" aria-hidden="true" />
                <p>Datos cifrados y sesiones seguras.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-white" aria-hidden="true" />
                <p>Atención prioritaria para roles clínicos.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>,
    portalElement,
  );
}
