"use client";

import { useState } from "react";

import { MapPin } from "@/components/ui/Icon";
import { saveCookieConsent } from "@/lib/privacy/cookie-consent";

import { useCookieConsent } from "./useCookieConsent";

interface ConsentedMapEmbedProps {
  src: string;
  title: string;
  /** Enlace directo a Google Maps (no deja cookies en este sitio). */
  directionsHref?: string;
}

/**
 * Mapa de Google detrás de una fachada (DOG-36): el iframe —y las cookies de Google— solo se
 * cargan si la persona aceptó "servicios de terceros" o pulsa "Cargar mapa".
 */
export function ConsentedMapEmbed({ src, title, directionsHref }: ConsentedMapEmbedProps) {
  const state = useCookieConsent();
  const [loadedThisVisit, setLoadedThisVisit] = useState(false);
  const [remember, setRemember] = useState(false);

  const allowed = loadedThisVisit || (state.status === "set" && state.consent.thirdParty);

  if (allowed) {
    return (
      <iframe
        src={src}
        title={title}
        className="aspect-4/3 h-full w-full rounded-2xl border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    );
  }

  const loadMap = () => {
    if (remember) {
      saveCookieConsent({ thirdParty: true });
    }
    setLoadedThisVisit(true);
  };

  return (
    <div className="flex aspect-4/3 w-full flex-col items-center justify-center gap-4 rounded-2xl p-6 text-center">
      <span className="icon-circle text-brand-teal dark:text-accent-cyan">
        <MapPin className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="max-w-xs text-sm leading-relaxed text-slate-200">
        El mapa lo ofrece Google y puede guardar sus propias cookies. Cárgalo solo si quieres verlo aquí.
      </p>
      <div className="flex flex-col items-center gap-3">
        <button type="button" onClick={loadMap} className="btn-primary px-5! py-2.5!">
          Cargar mapa
        </button>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="h-4 w-4 accent-brand-sky"
          />
          Recordar mi elección
        </label>
        {directionsHref ? (
          <a
            href={directionsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-brand-light underline-offset-4 hover:underline dark:text-accent-cyan"
          >
            Abrir en Google Maps
          </a>
        ) : null}
      </div>
    </div>
  );
}
