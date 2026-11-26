"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type MouseEvent } from "react";

import { Cookie, Lock, MapPin, X } from "@/components/ui/Icon";
import { saveCookieConsent, subscribeOpenCookiePreferences } from "@/lib/privacy/cookie-consent";
import { cn } from "@/lib/utils";

import { useCookieConsent } from "./useCookieConsent";

export const COOKIE_POLICY_HREF = "/politica-de-tratamiento-de-datos#cookies";

/** El portal y las vistas de impresión no muestran el aviso (sus cookies son solo esenciales). */
function isExcludedPath(pathname: string | null) {
  return Boolean(pathname && (pathname.startsWith("/portal") || pathname.endsWith("/print")));
}

/**
 * Aviso de cookies (DOG-36): barra pequeña no modal + panel de preferencias en un
 * `<dialog>` nativo. Rechazar cuesta lo mismo que aceptar (un clic) — sin patrones oscuros.
 */
export function CookieConsent() {
  const pathname = usePathname();
  const state = useCookieConsent();
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => subscribeOpenCookiePreferences(() => setPreferencesOpen(true)), []);

  const decide = useCallback((thirdParty: boolean) => {
    saveCookieConsent({ thirdParty });
    setPreferencesOpen(false);
  }, []);

  const showBanner = state.status === "unset" && !isExcludedPath(pathname);
  const currentThirdParty = state.status === "set" ? state.consent.thirdParty : false;

  return (
    <>
      {showBanner ? (
        <CookieBanner
          onAcceptAll={() => decide(true)}
          onEssentialOnly={() => decide(false)}
          onCustomize={() => setPreferencesOpen(true)}
        />
      ) : null}
      {preferencesOpen ? (
        <CookiePreferencesDialog
          initialThirdParty={currentThirdParty}
          onSave={decide}
          onClose={() => setPreferencesOpen(false)}
        />
      ) : null}
    </>
  );
}

interface CookieBannerProps {
  onAcceptAll: () => void;
  onEssentialOnly: () => void;
  onCustomize: () => void;
}

function CookieBanner({ onAcceptAll, onEssentialOnly, onCustomize }: CookieBannerProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <section
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="cookie-banner fixed inset-x-3 bottom-3 z-50 rounded-3xl border border-white/70 bg-white/90 p-3 shadow-xl shadow-slate-900/10 backdrop-blur-lg dark:border-surface-muted/70 dark:bg-surface-base/90 dark:shadow-surface-dark sm:inset-x-6 sm:bottom-6 sm:mx-auto sm:max-w-4xl sm:p-4 sm:px-5"
    >
      {/* Barra compacta: una fila en escritorio para no tapar el contenido. */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="icon-badge hidden shrink-0 text-brand-teal dark:text-accent-cyan sm:inline-flex">
            <Cookie className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            {/* En móvil el título solo lo leen los lectores de pantalla: la barra ocupa menos alto. */}
            <h2 id={titleId} className="text-sm font-semibold text-slate-900 max-sm:sr-only dark:text-white">
              Tu privacidad
            </h2>
            <p className="text-sm leading-snug text-slate-600 dark:text-slate-300">
              <span id={descriptionId}>
                Usamos cookies esenciales para que el sitio funcione. El mapa de Google solo se carga si lo
                aceptas.
              </span>{" "}
              <Link
                href={COOKIE_POLICY_HREF}
                className="font-semibold text-brand-teal underline underline-offset-4 dark:text-accent-cyan"
              >
                Política de cookies
              </Link>
            </p>
          </div>
        </div>
        <div className="grid grid-cols-[auto_1fr_1fr] gap-1.5 md:flex md:gap-2 md:shrink-0 md:items-center">
          <button
            type="button"
            onClick={onCustomize}
            className="rounded-full px-2 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-brand-light/60 hover:text-brand-teal focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-indigo/70 dark:text-slate-300 dark:hover:bg-surface-muted dark:hover:text-accent-cyan md:px-4"
          >
            Personalizar
          </button>
          <button type="button" onClick={onEssentialOnly} className="btn-secondary whitespace-nowrap px-2! py-2! text-xs! sm:px-4! sm:text-sm!">
            Solo esenciales
          </button>
          <button type="button" onClick={onAcceptAll} className="btn-primary whitespace-nowrap px-2! py-2! text-xs! sm:px-4! sm:text-sm!">
            Aceptar todo
          </button>
        </div>
      </div>
    </section>
  );
}

interface CookiePreferencesDialogProps {
  initialThirdParty: boolean;
  onSave: (thirdParty: boolean) => void;
  onClose: () => void;
}

function CookiePreferencesDialog({ initialThirdParty, onSave, onClose }: CookiePreferencesDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const thirdPartyId = useId();
  const [thirdParty, setThirdParty] = useState(initialThirdParty);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  // Respaldo de `closedby="any"` para navegadores que aún no lo soportan: clic en el fondo cierra.
  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      event.currentTarget.close();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={handleBackdropClick}
      {...({ closedby: "any" } as object)}
      className="cookie-dialog m-auto w-[min(32rem,calc(100%-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[1.75rem] border border-white/70 bg-white p-0 text-slate-700 shadow-2xl shadow-slate-900/20 dark:border-surface-muted/70 dark:bg-surface-base dark:text-slate-200"
    >
      <form
        method="dialog"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(thirdParty);
        }}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200/70 p-6 dark:border-surface-muted/70">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal dark:text-accent-cyan">
              Privacidad
            </p>
            <h2 id={titleId} className="text-xl font-semibold text-slate-900 dark:text-white">
              Preferencias de cookies
            </h2>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-indigo/70 dark:text-slate-400 dark:hover:bg-surface-muted dark:hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Cerrar</span>
          </button>
        </header>

        <div className="space-y-3 p-6">
          <CategoryCard
            icon={<Lock className="h-5 w-5" aria-hidden="true" />}
            title="Esenciales"
            description="Mantienen tu sesión del portal, protegen los formularios y recuerdan el tema claro u oscuro. Sin ellas el sitio no funciona."
            control={
              <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-teal dark:bg-accent-cyan/15 dark:text-accent-cyan">
                Siempre activas
              </span>
            }
          />
          <CategoryCard
            icon={<MapPin className="h-5 w-5" aria-hidden="true" />}
            title="Servicios de terceros"
            titleFor={thirdPartyId}
            description="Cargan el mapa de Google Maps en la sección de contacto. Google puede guardar sus propias cookies."
            active={thirdParty}
            control={
              <input
                id={thirdPartyId}
                type="checkbox"
                role="switch"
                checked={thirdParty}
                onChange={(event) => setThirdParty(event.target.checked)}
                className="cookie-switch"
              />
            }
          />
          <p className="pt-1 text-xs text-slate-500 dark:text-slate-400">
            Más detalles en la{" "}
            <Link
              href={COOKIE_POLICY_HREF}
              className="font-semibold text-brand-teal underline-offset-4 hover:underline dark:text-accent-cyan"
            >
              política de cookies
            </Link>
            .
          </p>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-200/70 bg-brand-light/40 p-6 dark:border-surface-muted/70 dark:bg-surface-muted/30 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => onSave(false)} className="btn-secondary">
            Solo esenciales
          </button>
          <button type="submit" className="btn-primary">
            Guardar preferencias
          </button>
        </footer>
      </form>
    </dialog>
  );
}

interface CategoryCardProps {
  icon: React.ReactNode;
  title: string;
  titleFor?: string;
  description: string;
  control: React.ReactNode;
  active?: boolean;
}

function CategoryCard({ icon, title, titleFor, description, control, active = true }: CategoryCardProps) {
  const TitleTag = titleFor ? "label" : "p";

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-colors duration-200",
        active
          ? "border-brand-sky/40 bg-brand-light/50 dark:border-accent-cyan/30 dark:bg-accent-cyan/5"
          : "border-slate-200/80 bg-white dark:border-surface-muted dark:bg-surface-base",
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="icon-badge shrink-0 text-brand-teal dark:text-accent-cyan">{icon}</span>
          <TitleTag
            {...(titleFor ? { htmlFor: titleFor } : {})}
            className={cn("font-semibold text-slate-900 dark:text-white", titleFor && "cursor-pointer")}
          >
            {title}
          </TitleTag>
        </div>
        {control}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  );
}
